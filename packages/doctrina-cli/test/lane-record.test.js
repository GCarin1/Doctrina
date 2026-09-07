import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Change 0042 — the lane is recorded, disagreements included.
//
// `work` classified every prompt, decided whether to hold it, printed the
// signals that matched — and threw the verdict away. So an archived proposal
// never said which lane the change was born in: no report could describe what
// kind of work a team does, and the classifier had no set of right and wrong
// answers to be calibrated against.
//
// The rule these pin: record the verdict AND what the operator did instead.
// Recording only the agreements would build a calibration set consisting
// entirely of the cases that need no calibrating.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-lane-"));
  assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
  return dir;
}

const laneOf = (dir, id) =>
  readFileSync(path.join(dir, ".doctrina", "changes", id, "proposal.md"), "utf8")
    .match(/^-\s+\*\*Lane:\*\*[ \t]*([^\r\n]*)/m)?.[1]?.trim() ?? null;

test("a change opened by work records the lane, its confidence and the signals", () => {
  const dir = project();
  try {
    assert.equal(runCli(["work", "add a billing invoice export", "--quiet"], dir).status, 0);
    const lane = laneOf(dir, "0001-add-a-billing-invoice-export");
    assert.match(lane, /^product \(confident; signals: /);
    assert.match(lane, /add/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the operator's DISAGREEMENT is recorded, which is the row calibration needs", () => {
  const dir = project();
  try {
    // Read as runtime, opened anyway: the classifier was overruled, and that
    // is precisely the case a calibration set must contain.
    runCli(["work", "--force", "the release workflow exports the secret but the job never sees it", "--quiet"], dir);
    const forced = laneOf(dir, changeMatching(dir, "workflow"));
    assert.match(forced, /^runtime \(/);
    assert.match(forced, /opened anyway \(--force\)/);

    // Opened as a chore instead of the lane the classifier read.
    runCli(["work", "--chore", "tidy the CI matrix", "--quiet"], dir);
    const chore = laneOf(dir, changeMatching(dir, "ci-matrix"));
    assert.match(chore, /opened as chore/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function changeMatching(dir, needle) {
  const id = readdirSync(path.join(dir, ".doctrina", "changes")).find((n) => n.includes(needle));
  assert.ok(id, `no change folder matching "${needle}"`);
  return id;
}

test("the lane reaches the index, and its absence is not invented", () => {
  const dir = project();
  try {
    runCli(["work", "add a billing invoice export", "--quiet"], dir);
    // A change opened by hand carries the empty scaffold field.
    runCli(["change", "new", "0009-by-hand", "opened without work"], dir);
    runCli(["index", "rebuild"], dir);

    const changes = JSON.parse(readFileSync(path.join(dir, ".doctrina", "index.json"), "utf8"))
      .artifacts.changes;
    const byWork = changes.find((c) => c.id.startsWith("0001"));
    const byHand = changes.find((c) => c.id === "0009-by-hand");
    assert.match(byWork.lane, /^product \(/);
    assert.equal(byHand.lane, undefined, "an unrecorded lane must be absent, not guessed");

    // And validate accepts both.
    assert.equal(runCli(["validate"], dir).status, 0, runCli(["validate"], dir).stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("report shows the lane mix, counting the unclassifiable as unknown", () => {
  const dir = project();
  try {
    runCli(["work", "add a billing invoice export", "--quiet"], dir);
    runCli(["work", "--chore", "tidy the CI matrix", "--quiet"], dir);
    runCli(["change", "new", "0009-by-hand", "opened without work"], dir);
    runCli(["index", "rebuild"], dir);

    const out = runCli(["report"], dir).stdout;
    assert.match(out, /## Lanes/);
    assert.match(out, /- product: 1/);
    assert.match(out, /- unknown: 1/, "a change with no recorded lane must not be folded into one");
    assert.match(out, /operator opened a different lane than read: 1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the recorded lane is history: no gate reads it to decide", () => {
  // A field a gate consulted would turn a hint into a verdict, and the
  // classifier is deterministic term matching that can be wrong.
  const dir = project();
  try {
    runCli(["work", "add a billing invoice export", "--quiet"], dir);
    const id = "0001-add-a-billing-invoice-export";
    const proposalPath = path.join(dir, ".doctrina", "changes", id, "proposal.md");
    const text = readFileSync(proposalPath, "utf8");

    const before = runCli(["analyze", id], dir);

    // Rewrite the lane to something absurd; every gate must behave identically.
    writeFileSync(proposalPath, text.replace(/^(-\s+\*\*Lane:\*\*)[^\r\n]*/m, "$1 not-a-lane (invented)"));
    runCli(["index", "rebuild"], dir);
    assert.equal(runCli(["validate"], dir).status, 0, "a nonsense lane must not fail validation");

    const after = runCli(["analyze", id], dir);
    assert.equal(after.status, before.status, "analyze must not read the lane");
    assert.equal(after.stdout, before.stdout, "analyze's report must not mention the lane at all");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
