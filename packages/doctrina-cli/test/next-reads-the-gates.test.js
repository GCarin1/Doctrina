import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Change 0064 — `next` reads the same signals `doctor` reports.
//
// Same project, same instant: `doctor` reported five findings each with a
// named remedy, and `next` answered `ok no open work`. The command whose
// entire job is to answer "what now?" was the one that said "nothing". It
// knew the change / ADR / index / intake / runtime / skill lifecycle and
// nothing about whether the gates were satisfied.
//
// The practical cost is bigger than the tidiness one: an adopting project
// that never ran `verify --init` closes changes forever with step 7 of the
// close on `skip` — the real build gate never executes — and the command that
// should say so said there was nothing to do.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project({ withSpec = true } = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-next-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  if (withSpec) {
    assert.equal(run(dir, ["spec", "new", "invoicing"]).status, 0);
    const p = path.join(dir, ".doctrina", "specs", "invoicing", "spec.md");
    writeFileSync(p, readFileSync(p, "utf8").replace("**Status:** draft", "**Status:** active"));
    assert.equal(run(dir, ["index", "rebuild"]).status, 0);
  }
  return dir;
}

// The comparison itself, derived from the two outputs rather than from a
// literal list — a hard-coded list would pass while the two drifted apart.
const gateWords = {
  coverage: /coverage|acceptance criteri/i,
  trace: /trace|intent anchor/i,
  verify: /verify/i,
};

test("where doctor warns, next recommends — on the same tree", () => {
  const dir = project();
  try {
    const doc = run(dir, ["doctor"]);
    const nxt = run(dir, ["next"]);
    assert.equal(nxt.status, 0, nxt.stderr);

    for (const [gate, re] of Object.entries(gateWords)) {
      const doctorWarns = doc.stdout.split("\n")
        .some((l) => /^\s+(warn|fail)\s/.test(l) && re.test(l));
      if (!doctorWarns) continue;
      assert.match(nxt.stdout, re,
        `doctor warns about ${gate} and next says nothing:\n--- doctor\n${doc.stdout}\n--- next\n${nxt.stdout}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an undeclared build gate is something to do, not silence", () => {
  const dir = project();
  try {
    const res = run(dir, ["next"]);
    assert.match(res.stdout, /doctrina verify --init/, res.stdout);
    assert.match(res.stdout, /close skips its build gate/, res.stdout);
    assert.doesNotMatch(res.stdout, /no open work/, res.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("dangling evidence and an inventory claim are both recommended", () => {
  const dir = project();
  try {
    const res = run(dir, ["next"]);
    // The scaffold ships one criterion citing `path/to/test`, which resolves
    // nowhere, and the spec is active while nothing is built.
    assert.match(res.stdout, /evidence missing on disk/, res.stdout);
    assert.match(res.stdout, /still "planned" with no note/, res.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("every gate action names a remedy that resolves it", () => {
  // Rule C2, applied to the new actions: run what the action says, and the
  // action must stop being recommended.
  const dir = project();
  try {
    const before = JSON.parse(run(dir, ["next", "--json"]).stdout).actions;
    const verifyAction = before.find((a) => a.id === "verify-unconfigured");
    assert.ok(verifyAction, JSON.stringify(before.map((a) => a.id)));
    assert.equal(run(dir, [verifyAction.command, ...verifyAction.args]).status, 0);

    const after = JSON.parse(run(dir, ["next", "--json"]).stdout).actions;
    assert.ok(!after.some((a) => a.id === "verify-unconfigured"),
      `the remedy did not clear its own finding: ${JSON.stringify(after.map((a) => a.id))}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a project with no capabilities yet is sent to intake, not to the gates", () => {
  const dir = project({ withSpec: false });
  try {
    const res = run(dir, ["next"]);
    assert.equal(res.status, 0, res.stderr);
    // The gates measure capabilities; before any exists they say nothing.
    assert.doesNotMatch(res.stdout, /acceptance criteri|intent anchor|verify --init/, res.stdout);
    assert.match(res.stdout, /doctrina intake/, res.stdout);
    assert.match(res.stdout, /doctrina work/, res.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the empty state offers the doors AGENTS.md names, not the hand-authoring ones", () => {
  const dir = project({ withSpec: false });
  try {
    const res = run(dir, ["next"]);
    assert.doesNotMatch(res.stdout, /doctrina change new/,
      "AGENTS.md tells the agent to open work with `work`, never by hand");
    assert.doesNotMatch(res.stdout, /doctrina spec new/, res.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the snapshot still collects the tree once", () => {
  // `prime` renders the views AND the actions; both must come from the same
  // collection, or a recommendation could contradict the row above it.
  const dir = project();
  try {
    const prime = run(dir, ["prime"]);
    assert.equal(prime.status, 0, prime.stderr);
    const covLine = prime.stdout.split("\n").find((l) => /coverage/i.test(l)) ?? "";
    assert.match(covLine, /0%|no criteria/, covLine);
    assert.match(prime.stdout, /verify --init|verify not configured/, prime.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
