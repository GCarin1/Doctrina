// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { DEPRECATED, OPERATIONS } from "../src/lib/commands.js";

// WHAT THE CLI TELLS YOU TO RUN NEXT IS A LIVE COMMAND.
//
// Changes 0177 and 0182 deprecated `skill sync` and `analyze`, and the
// prose around the catalog moved — but three things the CLI prints itself
// did not: `skill new` ended with "then run `doctrina skill sync`", `work
// --help` still walked analyze → apply → verify → archive → validate by
// hand, with no close, and two `validate` warnings said "analyze/apply
// will refuse it". A deprecated name keeps working, so nothing failed; the
// CLI simply taught the path it had just retired.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

const deprecated = Object.keys(DEPRECATED);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A line teaches a deprecated command when it tells you to run it
// (`doctrina <op>`) or lists it as a step of a chain (`→ op` / `op →`),
// unless the line itself says the name is deprecated.
function teaches(line) {
  if (/deprecated/i.test(line)) return null;
  for (const op of deprecated) {
    const name = escape(op);
    if (new RegExp(`doctrina ${name}(?![a-z-])`).test(line)) return op;
    if (new RegExp(`(→\\s*${name}(?![a-z-]))|((^|\\s)${name}\\s*→)`).test(line)) return op;
  }
  return null;
}

test("no live command's help tells you to run a deprecated one", () => {
  const commands = [...new Set(OPERATIONS.filter(([op]) => !DEPRECATED[op]).map(([op]) => op.split(" ")[0]))];
  const offenders = [];
  for (const cmd of commands) {
    const help = runCli([cmd, "--help"], os.tmpdir()).stdout;
    for (const line of help.split(/\r?\n/)) {
      const op = teaches(line);
      if (op) offenders.push(`${cmd} --help: ${op} — ${line.trim()}`);
    }
  }
  assert.deepEqual(offenders, []);
  // The guard can fail: the chain `work --help` used to print is caught.
  assert.equal(teaches("context → spec delta → tasks → implement → analyze → apply → verify"), "analyze");
  assert.equal(teaches("then run `doctrina skill sync` to update index.json"), "skill sync");
});

test("work --help ends in the close, and the close names its first step for the gate it holds", () => {
  const work = runCli(["work", "--help"], os.tmpdir()).stdout;
  assert.match(work, /`doctrina change check <id>`[\s\S]*`doctrina close <id>`/);
  const close = runCli(["close", "--help"], os.tmpdir()).stdout;
  assert.match(close, /^ {2}structure → ADR checkpoint/m);
});

test("skill new and validate point at live commands", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-live-hint-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
    const skill = runCli(["skill", "new", "backtest"], dir);
    assert.match(skill.stdout, /then run `doctrina index rebuild`/);
    assert.equal(teaches(skill.stdout), null);

    assert.equal(runCli(["change", "new", "0001-x", "Do x"], dir).status, 0);
    const delta = path.join(dir, ".doctrina", "changes", "0001-x", "specs", "core", "delta.md");
    mkdirSync(path.dirname(delta), { recursive: true });
    writeFileSync(delta, "# Spec Delta — capability: core\n\nno operation header\n");
    const validate = runCli(["validate"], dir);
    const out = validate.stdout + validate.stderr;
    assert.match(out, /has no \*\*Operation:\*\* header — `change apply` and the close will refuse it/);
    assert.match(out, /`change check` and the close refuse them/);
    assert.doesNotMatch(out, /analyze/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
