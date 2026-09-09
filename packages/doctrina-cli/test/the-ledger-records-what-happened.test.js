import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Change 0096 — the ledger records what happened, not what was attempted.
//
// `--force` waves a gate through, and the gap was written to the ledger at
// the moment of the override — before the transition was attempted, and
// often before one that never occurred. `change apply --force` on a change
// whose ops block cannot apply logged "forced apply past 3 blockers" while
// the apply wrote nothing, the target spec stayed byte-identical and the
// proposal stayed `proposed` (third audit, finding 3).
//
// The ledger is the readable source of what happened to the tree. An
// attempt that changed nothing did not happen to it.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-ledger-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
  return dir;
}

// A change left deliberately UNPLANNED — hollow proposal, scaffold tasks —
// so the structure gate blocks and `--force` has something to wave through.
function unplannedChange(dir, id, ops) {
  assert.equal(run(dir, ["change", "new", id, "a change"]).status, 0);
  const deltaDir = path.join(dir, ".doctrina", "changes", id, "specs", "carteira");
  mkdirSync(deltaDir, { recursive: true });
  writeFileSync(path.join(deltaDir, "delta.md"),
    "# Spec Delta — capability: carteira\n\n**Operation:** MODIFIED\n" +
    "**Target spec on apply:** `.doctrina/specs/carteira/spec.md`\n\n---\n\n" +
    "```ops\n" + ops + "\n```\n");
}

const ledgerPath = (dir) => path.join(dir, ".doctrina", "changes", "archive", "LEDGER.md");
const ledger = (dir) => (existsSync(ledgerPath(dir)) ? readFileSync(ledgerPath(dir), "utf8") : "");

test("a forced apply that fails claims nothing in the ledger", () => {
  const dir = project();
  try {
    unplannedChange(dir, "0001-fails", "frobnicate everything");
    const specBefore = readFileSync(path.join(dir, ".doctrina", "specs", "carteira", "spec.md"), "utf8");

    const applied = run(dir, ["change", "apply", "0001-fails", "--force"]);
    assert.notEqual(applied.status, 0, "an unappliable ops block must still fail");

    // Nothing happened, so nothing is claimed.
    assert.doesNotMatch(ledger(dir), /forced apply/,
      "the ledger claimed a forced apply that wrote nothing");
    // And the proof that nothing happened.
    assert.equal(
      readFileSync(path.join(dir, ".doctrina", "specs", "carteira", "spec.md"), "utf8"),
      specBefore, "the spec must be untouched");
    assert.match(
      readFileSync(path.join(dir, ".doctrina", "changes", "0001-fails", "proposal.md"), "utf8"),
      /Status:\*\*\s*proposed/, "the proposal must not have flipped");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a forced apply that succeeds is recorded, with its blockers", () => {
  // The other half: waving a real gate through IS history, and the ledger
  // is where it becomes visible instead of nowhere.
  const dir = project();
  try {
    unplannedChange(dir, "0002-succeeds", "bump-version patch");
    const applied = run(dir, ["change", "apply", "0002-succeeds", "--force"]);
    assert.equal(applied.status, 0, applied.stdout + applied.stderr);

    const text = ledger(dir);
    assert.match(text, /forced apply past \d+ blockers?/);
    assert.match(text, /0002-succeeds/);
    assert.match(text, /structure:/, "the ledger names which gate was waved through");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a forced archive is recorded only once the folder has moved", () => {
  const dir = project();
  try {
    unplannedChange(dir, "0003-archives", "bump-version patch");
    assert.equal(run(dir, ["change", "apply", "0003-archives", "--force"]).status, 0);

    const before = ledger(dir);
    const archived = run(dir, ["change", "archive", "0003-archives", "--force"]);
    assert.equal(archived.status, 0, archived.stdout + archived.stderr);

    const added = ledger(dir).slice(before.length);
    assert.match(added, /forced archive past \d+ blockers?/);
    assert.ok(
      existsSync(path.join(dir, ".doctrina", "changes", "archive")),
      "the archive directory must exist for the claim to be true");
    assert.ok(
      !existsSync(path.join(dir, ".doctrina", "changes", "0003-archives")),
      "the change folder must have moved");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a clean transition writes no forced-gap line at all", () => {
  const dir = project();
  try {
    // Planned properly, so no gate blocks and --force has nothing to wave.
    assert.equal(run(dir, ["change", "new", "0004-clean", "a clean change", "--chore"]).status, 0);
    const changeDir = path.join(dir, ".doctrina", "changes", "0004-clean");
    const tasks = path.join(changeDir, "tasks.md");
    const planned = readFileSync(tasks, "utf8").replace(/^(\s*-\s*\[[ xX]\])\s*$/gm, "$1 do the work");
    assert.notEqual(planned, readFileSync(tasks, "utf8"), "the fixture did not plan the tasks");
    writeFileSync(tasks, planned);

    const proposalPath = path.join(changeDir, "proposal.md");
    let proposal = readFileSync(proposalPath, "utf8");
    const nl = proposal.includes("\r\n") ? "\r\n" : "\n";
    for (const heading of ["Why", "What"]) {
      const before = proposal;
      proposal = proposal.replace(
        new RegExp(`(^##[ \\t]+${heading}[ \\t]*\\r?$)`, "m"), `$1${nl}${nl}Written.`);
      assert.notEqual(proposal, before, `the fixture did not write ## ${heading}`);
    }
    writeFileSync(proposalPath, proposal);

    assert.equal(run(dir, ["change", "apply", "0004-clean"]).status, 0);
    assert.doesNotMatch(ledger(dir), /forced/, "a clean apply must record no gap");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
