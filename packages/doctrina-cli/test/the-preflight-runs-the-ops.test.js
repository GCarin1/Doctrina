import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Change 0095 — the pre-flight runs the ops.
//
// `analyze` reported "ready to apply" for a delta whose ops block `apply`
// then refused: it inspected the delta's header, its target and its shape,
// and never the one part that does the work. `change check` already ran the
// dry-run, so the answer existed — the gate that `apply` and `close` consult
// was simply not the one asking. Tenth instance of "absence is not approval".
//
// Scoped pre-apply: after a successful apply the target holds what these ops
// just wrote, so re-running them against it is a question with no meaning.
// `archive` must still go through.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-preflight-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
  return dir;
}

// A change planned the way the gates require, carrying one MODIFIED delta
// whose ops block is whatever the case needs.
function changeWithOps(dir, id, opsBlock) {
  assert.equal(run(dir, ["change", "new", id, "a change"]).status, 0);
  const changeDir = path.join(dir, ".doctrina", "changes", id);

  const deltaDir = path.join(changeDir, "specs", "carteira");
  mkdirSync(deltaDir, { recursive: true });
  writeFileSync(path.join(deltaDir, "delta.md"),
    "# Spec Delta — capability: carteira\n\n**Operation:** MODIFIED\n" +
    "**Target spec on apply:** `.doctrina/specs/carteira/spec.md`\n\n---\n\n" +
    (opsBlock === null ? "Prose only, no ops block.\n" : "```ops\n" + opsBlock + "\n```\n"));

  const tasks = path.join(changeDir, "tasks.md");
  const planned = readFileSync(tasks, "utf8").replace(/^(\s*-\s*\[[ xX]\])\s*$/gm, "$1 do the work");
  assert.notEqual(planned, readFileSync(tasks, "utf8"), "the fixture did not plan the tasks");
  writeFileSync(tasks, planned);

  const proposalPath = path.join(changeDir, "proposal.md");
  let proposal = readFileSync(proposalPath, "utf8");
  const nl = proposal.includes("\r\n") ? "\r\n" : "\n";
  for (const [heading, prose] of [["Why", "Because the fixture needs a reason."],
                                  ["What", "The shape of the change under test."]]) {
    const before = proposal;
    proposal = proposal.replace(
      new RegExp(`(^##[ \\t]+${heading}[ \\t]*\\r?$)`, "m"), `$1${nl}${nl}${prose}`);
    assert.notEqual(proposal, before, `the fixture did not write ## ${heading}`);
  }
  writeFileSync(proposalPath, proposal);
  return changeDir;
}

test("analyze refuses an ops block that apply would refuse", () => {
  const dir = project();
  try {
    changeWithOps(dir, "0001-bad-ops",
      "replace-requirement ubiquitous 99: nothing here\nfrobnicate everything");

    const analyzed = run(dir, ["analyze", "0001-bad-ops"]);
    assert.equal(analyzed.status, 1, "analyze approved a delta apply would refuse");
    assert.match(analyzed.stdout, /op errors \(apply would refuse\)/);
    assert.match(analyzed.stdout, /unknown operation "frobnicate"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the refusal reaches apply through the structure gate", () => {
  // The point of putting this in collectAnalysis rather than in one command:
  // `apply` and `close` consult the gate map, not `analyze`'s rendering.
  const dir = project();
  try {
    changeWithOps(dir, "0002-bad-ops", "frobnicate everything");

    const applied = run(dir, ["change", "apply", "0002-bad-ops"]);
    assert.notEqual(applied.status, 0, "apply proceeded on a delta the pre-flight refused");
    assert.match(applied.stdout + applied.stderr, /\[structure\]/);
    assert.match(applied.stdout + applied.stderr, /frobnicate/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a delta whose ops apply cleanly still passes", () => {
  const dir = project();
  try {
    changeWithOps(dir, "0003-good-ops", "bump-version minor");
    const analyzed = run(dir, ["analyze", "0003-good-ops"]);
    assert.equal(analyzed.status, 0, analyzed.stdout);
    assert.match(analyzed.stdout, /1 op would apply cleanly/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a MODIFIED delta with no ops block is a manual merge, not a failure", () => {
  // `apply` prints a manual-merge pointer for these. Reporting it here is
  // what lets a close be planned around it instead of surprised by it — but
  // it must not fail the gate.
  const dir = project();
  try {
    changeWithOps(dir, "0004-no-ops", null);
    const analyzed = run(dir, ["analyze", "0004-no-ops"]);
    assert.equal(analyzed.status, 0, "a prose delta is a legitimate manual merge");
    assert.match(analyzed.stdout, /no ops block — apply will print a manual-merge pointer/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the dry-run is pre-apply only, so an applied change still archives", () => {
  // After a successful apply the target holds what the ops just wrote.
  // Re-running them against it is a question with no meaning, and asking it
  // at archive time would strand every change that had just been applied.
  const dir = project();
  try {
    const changeDir = changeWithOps(dir, "0005-applies", "bump-version minor");
    assert.equal(run(dir, ["change", "apply", "0005-applies"]).status, 0);

    // Everything ticked, the way `close` requires before archiving.
    for (const file of ["tasks.md", "proposal.md"]) {
      const p = path.join(changeDir, file);
      writeFileSync(p, readFileSync(p, "utf8").replaceAll("- [ ]", "- [x]"));
    }
    const archived = run(dir, ["change", "archive", "0005-applies"]);
    assert.equal(archived.status, 0, archived.stdout + archived.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
