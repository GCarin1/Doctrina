// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { operationOf, recordUsage, summarise, USAGE_ENV } from "../src/lib/usage.js";
import { OPERATIONS } from "../src/lib/commands.js";

// M8. Instrumenting the command surface before shrinking it. These tests
// exist mostly to pin the PROMISES, not the feature: off unless asked, no
// arguments captured, never fatal. An instrument that quietly grows its
// appetite is worse than no instrument.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const KNOWN = new Set(OPERATIONS.map((o) => o[0]));

test("recording is off unless the operator names a log file", () => {
  assert.equal(recordUsage(["status"], 0, KNOWN, {}), false);
  assert.equal(recordUsage(["status"], 0, KNOWN, { OTHER: "x" }), false);
});

test("a sub-operation is recorded only when the catalog has one", () => {
  // Shape cannot tell `spec new` from `context cli` — both are a command
  // followed by a lowercase word. Guessing recorded `context cli` as an
  // operation and left the real `context` looking unused, which is the
  // exact wrong answer from an instrument built to find unused commands.
  assert.equal(operationOf(["spec", "new", "billing"], KNOWN), "spec new");
  assert.equal(operationOf(["change", "apply", "0021-x"], KNOWN), "change apply");
  assert.equal(operationOf(["context", "cli"], KNOWN), "context");
  assert.equal(operationOf(["why", "billing"], KNOWN), "why");
  assert.equal(operationOf([], KNOWN), null);
});

test("no argument, path, id or prompt is ever recorded", () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-usage-"));
  const log = path.join(tmp, "usage.jsonl");
  try {
    const secrets = [
      ["work", "migrate the acme-payments merchant ledger"],
      ["change", "apply", "0031-acme-internal-codename"],
      ["show", "/home/someone/private/path.md"],
    ];
    for (const argv of secrets) recordUsage(argv, 0, KNOWN, { [USAGE_ENV]: log });

    const text = readFileSync(log, "utf8");
    for (const leak of ["acme", "merchant", "codename", "someone", "private", "0031"]) {
      assert.ok(!text.toLowerCase().includes(leak), `usage log leaked "${leak}":\n${text}`);
    }
    const rows = text.trim().split("\n").map((l) => JSON.parse(l));
    assert.deepEqual(rows.map((r) => r.operation), ["work", "change apply", "show"]);
    // Exactly three keys, so a future field cannot arrive unnoticed.
    for (const row of rows) {
      assert.deepEqual(Object.keys(row).sort(), ["at", "exit", "operation"]);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("a failure to record never breaks the command being measured", () => {
  // An unwritable target must be swallowed: losing a usage sample matters
  // less than nothing; losing the command's real work would be absurd.
  const impossible = path.join(os.tmpdir(), "doctrina-nope", "deeper", "usage.jsonl");
  assert.doesNotThrow(() => recordUsage(["status"], 0, KNOWN, { [USAGE_ENV]: impossible }));
  assert.equal(recordUsage(["status"], 0, KNOWN, { [USAGE_ENV]: impossible }), false);
});

test("the CLI writes nothing when the env var is unset", () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-usage-off-"));
  try {
    spawnSync(process.execPath, [cliEntry, "init", "--non-interactive",
      "--project-name", "Acme", "--project-description", "x"], { cwd: tmp, encoding: "utf8" });
    spawnSync(process.execPath, [cliEntry, "status"], { cwd: tmp, encoding: "utf8" });
    assert.ok(!existsSync(path.join(tmp, ".doctrina", "usage.jsonl")),
      "no usage file may appear without the operator asking for one");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("the CLI records end to end once the env var is set", () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-usage-on-"));
  const log = path.join(tmp, "usage.jsonl");
  try {
    const env = { ...process.env, [USAGE_ENV]: log };
    spawnSync(process.execPath, [cliEntry, "init", "--non-interactive",
      "--project-name", "Acme", "--project-description", "x"], { cwd: tmp, encoding: "utf8", env });
    spawnSync(process.execPath, [cliEntry, "spec", "new", "billing"], { cwd: tmp, encoding: "utf8", env });
    spawnSync(process.execPath, [cliEntry, "context", "billing"], { cwd: tmp, encoding: "utf8", env });

    const ops = readFileSync(log, "utf8").trim().split("\n").map((l) => JSON.parse(l).operation);
    assert.deepEqual(ops, ["init", "spec new", "context"]);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("summarise reports usage counts and the never-invoked remainder", () => {
  const log = [
    JSON.stringify({ at: "2026-08-06T10:00:00Z", operation: "validate", exit: 0 }),
    JSON.stringify({ at: "2026-08-06T10:01:00Z", operation: "validate", exit: 1 }),
    JSON.stringify({ at: "2026-08-06T10:02:00Z", operation: "close", exit: 0 }),
    "not json at all",     // a truncated write must not poison the report
    "",
  ].join("\n");

  const { samples, used, unused } = summarise(log, ["validate", "close", "doctor", "watch"]);
  assert.equal(samples, 3);
  assert.deepEqual(used, [["validate", 2], ["close", 1]]);
  assert.deepEqual(unused, ["doctor", "watch"]);
});

// A proposal section that survived as a HEADING is not a section that was
// written. Six changes closed in one session with every rationale section
// still holding its scaffold comment, because `analyze` only checked that
// `## Why` existed.
test("analyze refuses a proposal whose sections are still scaffold", () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-hollow-"));
  try {
    const run = (...args) => spawnSync(process.execPath, [cliEntry, ...args], { cwd: tmp, encoding: "utf8" });
    run("init", "--non-interactive", "--project-name", "Acme", "--project-description", "x");
    run("change", "new", "0001-thing", "A thing");

    const scaffolded = run("analyze", "0001-thing");
    assert.match(scaffolded.stdout, /unwritten section/,
      "a freshly scaffolded proposal must be reported as unwritten");

    // Write every section, and the finding must clear.
    const proposal = path.join(tmp, ".doctrina", "changes", "0001-thing", "proposal.md");
    const filled = readFileSync(proposal, "utf8")
      .replace(/<!--[\s\S]*?-->/g, "Real prose explaining this section.");
    writeFileSync(proposal, filled);

    const written = run("analyze", "0001-thing");
    assert.doesNotMatch(written.stdout, /unwritten section/,
      "a proposal with prose in every section must pass");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
