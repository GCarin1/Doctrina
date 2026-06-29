import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { COMMAND_NAMES, referencedCommands } from "../src/lib/commands.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, { cwd } = {}) {
  return spawnSync("node", [cliEntry, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
}

function initProject() {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-cmd-"));
  runCli(["init", "--non-interactive", "--project-name", "Acme", "--project-description", "x"], { cwd: tmp });
  return tmp;
}

// The canonical catalog and the real dispatch table must never drift: every
// name in COMMAND_NAMES must resolve to a handler that prints help rather than
// the "unknown command" error. This is what lets `validate` trust the catalog.
test("every canonical command name resolves to a real handler", () => {
  for (const name of COMMAND_NAMES) {
    const r = runCli([name, "--help"]);
    assert.equal(r.status, 0, `\`doctrina ${name} --help\` should exit 0 (got ${r.status}): ${r.stderr}`);
    assert.doesNotMatch(r.stderr, /unknown command/, `\`${name}\` is catalogued but not dispatched`);
  }
});

test("referencedCommands reads command references only from code context", () => {
  const md = [
    "This repo uses the doctrina framework for spec-driven work.", // prose — must NOT match
    "Run `doctrina status` first.", // inline span — matches
    "```",
    "npx doctrina-cli validate", // fenced npx form — matches
    "doctrina why cli", // fenced bare form — matches
    "```",
  ].join("\n");
  const refs = referencedCommands(md);
  assert.ok(refs.has("status") && refs.has("validate") && refs.has("why"));
  assert.ok(!refs.has("framework"), "prose 'doctrina framework' must not read as a command");
});

test("validate warns when an exhaustive AGENTS.md catalog omits commands", () => {
  const tmp = initProject();
  try {
    const stale = [
      "# AGENTS.md — Acme", "", "## Commands", "", "```",
      "doctrina init", 'doctrina work "x"', "doctrina spec new x",
      'doctrina change new x "t"', 'doctrina decision new "t"',
      "doctrina validate", "doctrina context", "doctrina status",
      "```", "",
    ].join("\n");
    writeFileSync(path.join(tmp, "AGENTS.md"), stale);
    const r = runCli(["validate"], { cwd: tmp });
    assert.match(r.stdout, /omits \d+ commands?/);
    assert.match(r.stdout, /will not discover/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("validate stays silent on omissions when AGENTS.md defers to --help", () => {
  const tmp = initProject();
  try {
    const deferring = [
      "# AGENTS.md — Acme", "", "## Commands", "",
      "Full list: `doctrina --help`.", "", "```",
      "doctrina init", 'doctrina work "x"', "doctrina spec new x",
      'doctrina change new x "t"', 'doctrina decision new "t"',
      "doctrina validate", "doctrina context", "doctrina status",
      "```", "",
    ].join("\n");
    writeFileSync(path.join(tmp, "AGENTS.md"), deferring);
    const r = runCli(["validate"], { cwd: tmp });
    assert.doesNotMatch(r.stdout, /omits \d+ command/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("validate warns when AGENTS.md references a command the CLI lacks", () => {
  const tmp = initProject();
  try {
    const p = path.join(tmp, "AGENTS.md");
    writeFileSync(p, readFileSync(p, "utf8") + "\nRun `doctrina bogusverb` to win.\n");
    const r = runCli(["validate"], { cwd: tmp });
    assert.match(r.stdout, /references `doctrina bogusverb` which is not a CLI command/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("constitution assembles accepted ADRs and product non-goals, read-only", () => {
  const tmp = initProject();
  try {
    // One accepted ADR and one still-proposed: only the accepted is a rule.
    runCli(["decision", "new", "Use Postgres"], { cwd: tmp });
    runCli(["decision", "accept", "0001"], { cwd: tmp });
    runCli(["decision", "new", "Still deciding"], { cwd: tmp });
    // Control product.md's Non-goals section (the scaffold ships an empty one).
    const prod = path.join(tmp, ".doctrina", "product.md");
    writeFileSync(prod, "# Acme — Product\n\n## Non-goals\n\n- It is not a build tool.\n");

    const r = runCli(["constitution"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /ADR 0001/);
    assert.match(r.stdout, /Use Postgres/);
    assert.doesNotMatch(r.stdout, /Still deciding/, "proposed ADRs are not yet binding");
    assert.match(r.stdout, /It is not a build tool\./);
    // Read-only: nothing changed on disk.
    const check = runCli(["index", "rebuild", "--check"], { cwd: tmp });
    assert.equal(check.status, 0, check.stdout);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("context without a capability includes every active spec (current truth)", () => {
  const tmp = initProject();
  try {
    runCli(["spec", "new", "billing"], { cwd: tmp });
    runCli(["spec", "new", "auth"], { cwd: tmp });
    const r = runCli(["context"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /specs[\\/]auth[\\/]spec\.md/);
    assert.match(r.stdout, /specs[\\/]billing[\\/]spec\.md/);
    // Read order: specs sit after product.md, before any ADR.
    assert.ok(
      r.stdout.indexOf("product.md") < r.stdout.indexOf("billing"),
      "specs must come after product.md in the read order",
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("init registers AGENTS.md as the index entrypoint and stays drift-free", () => {
  const tmp = initProject();
  try {
    const index = JSON.parse(readFileSync(path.join(tmp, ".doctrina", "index.json"), "utf8"));
    assert.equal(index.artifacts.entrypoint?.path, "AGENTS.md", "index must link to the hub");
    // The scaffolded index (from template) must equal what deriveIndex produces,
    // or `index rebuild --check` (a CI gate) would fail on a fresh project.
    const check = runCli(["index", "rebuild", "--check"], { cwd: tmp });
    assert.equal(check.status, 0, check.stdout || check.stderr);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

function setCriteria(tmp, cap, criteriaBlock) {
  const specPath = path.join(tmp, ".doctrina", "specs", cap, "spec.md");
  const spec = readFileSync(specPath, "utf8").replace(
    /## Acceptance criteria[\s\S]*$/,
    `## Acceptance criteria\n\n${criteriaBlock}\n`,
  );
  writeFileSync(specPath, spec);
}

test("validate flags a [verified] criterion that cites no proof", () => {
  const tmp = initProject();
  try {
    runCli(["spec", "new", "billing"], { cwd: tmp });
    mkdirSync(path.join(tmp, "src"), { recursive: true });
    writeFileSync(path.join(tmp, "src", "server.js"), "// proof\n");
    setCriteria(tmp, "billing", "1. [verified] The thing works.\n2. [verified] Proven by `src/server.js`.");
    const r = runCli(["validate"], { cwd: tmp });
    assert.match(r.stdout, /acceptance criterion #1 is marked \[verified\] but cites no proof/);
    assert.doesNotMatch(r.stdout, /#2 is marked \[verified\]/, "criterion #2 cites real proof");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("why reads proof on a continuation line and flags verified-without-proof", () => {
  const tmp = initProject();
  try {
    runCli(["spec", "new", "billing"], { cwd: tmp });
    mkdirSync(path.join(tmp, "src"), { recursive: true });
    writeFileSync(path.join(tmp, "src", "server.js"), "// proof\n");
    // #1's proof sits on a continuation line — the exact case the old
    // single-line parser missed (it printed "no evidence cited").
    setCriteria(
      tmp, "billing",
      "1. [verified] Works as documented —\n   proven by `src/server.js`.\n2. [verified] Claims to work but cites nothing.",
    );
    const r = runCli(["why", "billing"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /#1.*server\.js/, "proof on a continuation line must be found");
    assert.match(r.stdout, /#2.*cites no proof/, "a verified claim with no proof must not read as green");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("why surfaces the archived changes that built a capability", () => {
  const tmp = initProject();
  try {
    runCli(["spec", "new", "redirect"], { cwd: tmp });
    // Inject an archive-ledger entry the way `index rebuild` derives one from a
    // change's spec deltas, then assert `why` reaches back to it.
    const indexPath = path.join(tmp, ".doctrina", "index.json");
    const index = JSON.parse(readFileSync(indexPath, "utf8"));
    index.artifacts.changes_archive = [{
      id: "0001-add-redirect",
      title: "Add redirect capability",
      path: ".doctrina/changes/archive/2026-06-02-0001-add-redirect",
      status: "applied",
      applied: "2026-06-02",
      specs_affected: [{ capability: "redirect", operation: "ADDED" }],
    }];
    writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n");
    const r = runCli(["why", "redirect"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /History/);
    assert.match(r.stdout, /Add redirect capability \(ADDED\)/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("the default scaffolded AGENTS.md does not drift from the CLI surface", () => {
  const tmp = initProject();
  try {
    const r = runCli(["validate"], { cwd: tmp });
    assert.doesNotMatch(r.stdout, /omits \d+ command/, r.stdout);
    assert.doesNotMatch(r.stdout, /not a CLI command/, r.stdout);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
