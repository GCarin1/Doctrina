// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// `change check` REPORTS WHAT `analyze` REPORTED, FIRST.
//
// `change check` runs the structural pre-flight as its first section, line
// for line what `analyze` prints, then the ops dry-run and the archive-gate
// preview. Two commands, one question asked twice; `analyze` is deprecated
// (ADR 0026: redundancy, shown by a test).
//
// One difference is real and stated rather than hidden: `check` answers
// "would the close pass?", so it exits 1 while a Verification box is open,
// where `analyze` answered "would the apply pass?". The pre-apply gate is
// not lost — `change apply` still refuses exactly what `analyze` refused.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

const checks = (out) => out.split(/\r?\n/).filter((l) => /^[✓✗] /.test(l));

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-check-"));
  assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
  assert.equal(runCli(["spec", "new", "core"], dir).status, 0);
  return dir;
}

// A change planned for real: written proposal, real tasks, an ADDED delta.
function plannedChange(dir, id) {
  assert.equal(runCli(["change", "new", id, "Do x"], dir).status, 0);
  const change = path.join(dir, ".doctrina", "changes", id);
  const proposal = path.join(change, "proposal.md");
  writeFileSync(proposal, readFileSync(proposal, "utf8")
    .replace(/## Why\r?\n\r?\n<!--[\s\S]*?-->\r?\n/, "## Why\n\nBecause x.\n")
    .replace(/## What\r?\n\r?\n<!--[\s\S]*?-->\r?\n/, "## What\n\nThe thing x.\n"));
  const tasks = path.join(change, "tasks.md");
  writeFileSync(tasks, readFileSync(tasks, "utf8").replace(/(- \[ \]\r?\n){3}/, "- [ ] Do x.\n"));
  mkdirSync(path.join(change, "specs", "extra"), { recursive: true });
  writeFileSync(path.join(change, "specs", "extra", "delta.md"),
    "# Spec Delta — capability: extra\n\n**Operation:** ADDED\n" +
    "**Target spec on apply:** `.doctrina/specs/extra/spec.md`\n\n---\n\n# Spec — Extra\n\nbody\n");
  return change;
}

test("every line analyze prints is change check's first section, with the same verdict", () => {
  const dir = project();
  try {
    assert.equal(runCli(["change", "new", "0001-hollow", "Hollow"], dir).status, 0);
    const analyze = runCli(["analyze", "0001-hollow"], dir);
    const check = runCli(["change", "check", "0001-hollow"], dir);
    const first = check.stdout.slice(check.stdout.indexOf("1/3"), check.stdout.indexOf("2/3"));
    assert.deepEqual(checks(first), checks(analyze.stdout));
    assert.ok(checks(analyze.stdout).some((l) => l.startsWith("✗")), "the hollow change fails");
    assert.equal(analyze.status, 1);
    assert.equal(check.status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check also answers for the close; the pre-apply gate stays in change apply", () => {
  const dir = project();
  try {
    plannedChange(dir, "0002-ready");
    runCli(["change", "tick", "0002-ready", "1"], dir);
    // Structurally sound, Verification boxes still open.
    assert.equal(runCli(["analyze", "0002-ready"], dir).status, 0);
    const check = runCli(["change", "check", "0002-ready"], dir);
    assert.equal(check.status, 1);
    assert.match(check.stdout, /\[verification\]/, "it names the close's blocker");

    // What analyze refused, apply refuses: a hollow proposal.
    assert.equal(runCli(["change", "new", "0003-hollow", "Hollow"], dir).status, 0);
    const apply = runCli(["change", "apply", "0003-hollow"], dir);
    assert.equal(apply.status, 1);
    assert.match(apply.stdout + apply.stderr, /unwritten section/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("analyze warns and names change check; the close and next point there too", () => {
  const dir = project();
  try {
    assert.equal(runCli(["change", "new", "0004-hollow", "Hollow"], dir).status, 0);
    const analyze = runCli(["analyze", "0004-hollow"], dir);
    assert.match(analyze.stderr, /deprecated:.*doctrina change check/);

    const close = runCli(["close", "0004-hollow"], dir);
    assert.notEqual(close.status, 0);
    assert.match(close.stdout + close.stderr, /doctrina change check 0004-hollow/);
    assert.doesNotMatch(close.stdout + close.stderr, /doctrina analyze 0004-hollow/);

    const change = plannedChange(dir, "0005-done");
    writeFileSync(path.join(change, "tasks.md"),
      readFileSync(path.join(change, "tasks.md"), "utf8").replace(/- \[ \]/g, "- [x]"));
    const next = runCli(["next"], dir).stdout;
    assert.match(next, /doctrina change check 0005-done, then doctrina close 0005-done/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
