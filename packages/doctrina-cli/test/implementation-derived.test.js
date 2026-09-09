import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { deriveImplementation, implementationMismatch } from "../src/commands/coverage.js";

// Change 0036 — the Implementation header is DERIVED, not remembered.
//
// The `work` playbook asked the agent twice (steps 5 and 7) to advance a
// field whose correct value coverage had already computed one file over. So
// the value comes off the arithmetic, and every surface that touches it —
// `validate`'s warning, `close`'s advisory op, `spec set --implementation
// auto` — reads the SAME derivation, which is what stops three answers to
// one question.
//
// Nothing here rewrites a header on its own: the gates propose, a person or
// an explicit command applies. A gate that edited the claim it is checking
// would be marking its own homework.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

// Plan a scaffolded change the way the gates require — real task text and a
// proposal that says why and what — so `analyze` passes and the close reaches
// the step under test rather than stopping at step 1.
function planChange(dir, id) {
  const changeDir = path.join(dir, ".doctrina", "changes", id);
  const tasks = path.join(changeDir, "tasks.md");
  writeFileSync(tasks, readFileSync(tasks, "utf8").replace(/^(\s*-\s*\[[ xX]\])\s*$/gm, "$1 do the work"));
  const proposalPath = path.join(changeDir, "proposal.md");
  let proposal = readFileSync(proposalPath, "utf8");
  for (const [heading, prose] of [["Why", "Because the fixture needs a reason."],
                                  ["What", "The shape of the change under test."]]) {
    proposal = proposal.replace(new RegExp(`(^## ${heading}[ \\t]*$)`, "m"), `$1\n\n${prose}`);
  }
  writeFileSync(proposalPath, proposal);
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-impl-"));
  const r = runCli(["init", "--non-interactive", "--project-name", "Acme"], dir);
  assert.equal(r.status, 0, r.stderr);
  return dir;
}

// A spec whose criteria all cite `proof`, plus however many bare ones are
// asked for. `proof` is a file that exists, so those criteria resolve.
function writeSpec(dir, cap, { implementation, covered, bare = 0 }) {
  const specDir = path.join(dir, ".doctrina", "specs", cap);
  mkdirSync(specDir, { recursive: true });
  writeFileSync(path.join(dir, "proof.js"), "// evidence\n");
  const criteria = [];
  let n = 0;
  for (let i = 0; i < covered; i++) criteria.push(`${++n}. [verified] proven — verified by \`proof.js\`.`);
  for (let i = 0; i < bare; i++) criteria.push(`${++n}. [unverified] nothing cited yet.`);
  writeFileSync(path.join(specDir, "spec.md"),
    `# Spec — ${cap}\n\n**Capability:** ${cap}\n**Status:** active\n` +
    `**Implementation:** ${implementation}\n**Realizes:** n/a — internal\n` +
    `**Last updated:** 2026-09-07\n**Version:** 0.1.0\n\n## Purpose\n\nA fixture.\n\n` +
    `## Acceptance criteria\n\n${criteria.join("\n")}\n`);
  runCli(["index", "rebuild"], dir);
}

// --------------------------------------------------------------- the rule

test("the three bands of the rule: verified, partial, planned", () => {
  assert.equal(deriveImplementation({ total: 3, covered: 3, dangling: 0, conditional: 0, unguarded: 0, deferred: 0 }), "verified");
  assert.equal(deriveImplementation({ total: 3, covered: 1, dangling: 2, conditional: 0, unguarded: 0, deferred: 0 }), "partial");
  assert.equal(deriveImplementation({ total: 3, covered: 0, dangling: 3, conditional: 0, unguarded: 0, deferred: 0 }), "planned");
});

test("a criterion that is not fully proven keeps the spec off `verified`", () => {
  // Each of these is a documented "not proven": the cited path is missing,
  // the only proof is a skipped suite, an orchestration criterion cites no
  // guarded check, or the spec declared a deferral. None may read as proof.
  for (const kind of ["dangling", "conditional", "unguarded", "deferred"]) {
    const row = { total: 2, covered: 1, dangling: 0, conditional: 0, unguarded: 0, deferred: 0, [kind]: 1 };
    assert.equal(deriveImplementation(row), "partial", `${kind} must not count as proof`);
  }
});

test("a spec with no acceptance criteria derives nothing, so no surface nags about it", () => {
  assert.equal(deriveImplementation({ total: 0, covered: 0, dangling: 0, conditional: 0, unguarded: 0, deferred: 0 }), null);
  assert.equal(deriveImplementation(null), null);
  assert.equal(implementationMismatch("planned", null), null);
});

test("the mismatch reports both directions, and names the op that settles it", () => {
  // Overstating: claiming proof the arithmetic does not support.
  assert.deepEqual(implementationMismatch("verified", "partial"),
    { written: "verified", derived: "partial", op: "set-header Implementation: partial" });
  // Understating: the one that actually happens, and makes readers stop
  // trusting the field.
  assert.deepEqual(implementationMismatch("planned", "verified"),
    { written: "planned", derived: "verified", op: "set-header Implementation: verified" });
  assert.equal(implementationMismatch("partial", "partial"), null);
});

test("`implemented` at full coverage is the ladder working, not a mismatch", () => {
  // planned -> partial -> implemented -> verified: `implemented` is the rung
  // that says "the code is there; I have not certified it". Understating by
  // exactly that rung is deliberate.
  assert.equal(implementationMismatch("implemented", "verified"), null);
  // It is not a blanket exemption: `implemented` on a half-proven spec still
  // overstates what the evidence supports.
  assert.deepEqual(implementationMismatch("implemented", "partial"),
    { written: "implemented", derived: "partial", op: "set-header Implementation: partial" });
});

test("a note after the state word is the escape hatch, in every band", () => {
  assert.equal(implementationMismatch("planned — backend deferred, see ADR 0007", "verified"), null);
  assert.equal(implementationMismatch("verified — durable adapter, proof runs nightly", "planned"), null);
});

// -------------------------------------------------------------- validate

test("validate warns when a fully proven spec still says planned, and the note silences it", () => {
  const dir = project();
  try {
    writeSpec(dir, "billing", { implementation: "planned", covered: 2 });
    const warned = runCli(["validate"], dir);
    assert.match(warned.stdout, /Implementation is "planned" but 2\/2 criteria have resolving proof/);
    assert.match(warned.stdout, /doctrina spec set billing --implementation auto/);

    writeSpec(dir, "billing", { implementation: "planned — backend deferred, see ADR 0007", covered: 2 });
    const quiet = runCli(["validate"], dir);
    assert.doesNotMatch(quiet.stdout, /have resolving proof/, "a declared deferral must stay silent");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validate warns when a half-proven spec claims verified", () => {
  const dir = project();
  try {
    writeSpec(dir, "billing", { implementation: "verified", covered: 1, bare: 1 });
    const r = runCli(["validate"], dir);
    assert.match(r.stdout, /Implementation is "verified" but 1\/2 criteria have resolving proof/);
    assert.match(r.stdout, /supports "partial"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// -------------------------------------------------- spec set --implementation auto

test("`spec set --implementation auto` writes the value the rule derives", () => {
  const dir = project();
  try {
    const specPath = path.join(dir, ".doctrina", "specs", "billing", "spec.md");

    writeSpec(dir, "billing", { implementation: "planned", covered: 2 });
    const toVerified = runCli(["spec", "set", "billing", "--implementation", "auto"], dir);
    assert.equal(toVerified.status, 0, toVerified.stderr || toVerified.stdout);
    assert.match(readFileSync(specPath, "utf8"), /^\*\*Implementation:\*\* verified$/m);

    writeSpec(dir, "billing", { implementation: "verified", covered: 1, bare: 1 });
    const toPartial = runCli(["spec", "set", "billing", "--implementation", "auto"], dir);
    assert.equal(toPartial.status, 0, toPartial.stderr || toPartial.stdout);
    assert.match(readFileSync(specPath, "utf8"), /^\*\*Implementation:\*\* partial$/m);

    // And the tree is clean afterwards: the header no longer contradicts the
    // arithmetic, so the warning it raised is gone.
    assert.doesNotMatch(runCli(["validate"], dir).stdout, /have resolving proof/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("`--implementation auto` refuses a spec with nothing to derive from, leaving it untouched", () => {
  const dir = project();
  try {
    const specDir = path.join(dir, ".doctrina", "specs", "empty");
    mkdirSync(specDir, { recursive: true });
    const specPath = path.join(specDir, "spec.md");
    // No "## Acceptance criteria" section at all: nothing to count.
    writeFileSync(specPath,
      "# Spec — empty\n\n**Capability:** empty\n**Status:** draft\n" +
      "**Implementation:** planned\n**Realizes:** n/a — internal\n" +
      "**Last updated:** 2026-09-07\n**Version:** 0.1.0\n\n## Purpose\n\nNothing yet.\n");
    runCli(["index", "rebuild"], dir);
    const before = readFileSync(specPath, "utf8");

    const r = runCli(["spec", "set", "empty", "--implementation", "auto"], dir);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /needs acceptance criteria to derive from/);
    assert.equal(readFileSync(specPath, "utf8"), before, "a refused op must leave the spec untouched");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ------------------------------------------------------------------ close

test("close proposes the set-header op instead of asking the agent to remember it", () => {
  const dir = project();
  try {
    writeSpec(dir, "billing", { implementation: "planned", covered: 2 });
    const r0 = runCli(["change", "new", "0001-bill", "bill things"], dir);
    assert.equal(r0.status, 0, r0.stderr);
    planChange(dir, "0001-bill");

    const r = runCli(["close", "0001-bill"], dir);
    assert.match(r.stdout, /implementation \(advisory\)/);
    assert.match(r.stdout, /set-header Implementation: verified/);
    assert.match(r.stdout, /doctrina spec set billing --implementation auto/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the close's implementation step is advisory: it proposes and never rewrites", () => {
  const dir = project();
  try {
    writeSpec(dir, "billing", { implementation: "planned", covered: 2 });
    const specPath = path.join(dir, ".doctrina", "specs", "billing", "spec.md");
    const before = readFileSync(specPath, "utf8");
    runCli(["change", "new", "0001-bill", "bill things"], dir);
    planChange(dir, "0001-bill");
    runCli(["close", "0001-bill"], dir);
    assert.equal(readFileSync(specPath, "utf8"), before,
      "the close must not edit the header it is reporting on");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
