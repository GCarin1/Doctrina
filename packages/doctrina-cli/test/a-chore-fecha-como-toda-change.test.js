// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// A CHORE CLOSES THE WAY EVERY CHANGE CLOSES.
//
// AGENTS.md says `doctrina close <id>` is the definition of done, and the
// work playbook ends there. The chore playbook ended with `change apply`,
// `change archive` and `validate` by hand — a path that never runs the
// close's review, its documentation and changelog gate, coverage, trace or
// the ADR checkpoint. A chore is still a change; it simply has no delta.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

test("the chore playbook ends with the close, not a hand-run apply and archive", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-chore-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
    const r = runCli(["work", "--chore", "tidy the CI matrix", "--id", "0001-chore"], dir);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /doctrina close 0001-chore/);
    assert.doesNotMatch(r.stdout, /doctrina change (apply|archive)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a chore done by its playbook closes in one pass", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-chore-"));
  try {
    spawnSync("git", ["init", "-q"], { cwd: dir });
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
    writeFileSync(path.join(dir, ".doctrina", "verify.json"),
      JSON.stringify({ checks: [{ name: "ok", run: "node -e 0" }] }));
    assert.equal(runCli(["work", "--chore", "tidy the CI matrix", "--id", "0001-chore", "--quiet"], dir).status, 0);
    const change = path.join(dir, ".doctrina", "changes", "0001-chore");
    const proposal = path.join(change, "proposal.md");
    writeFileSync(proposal, readFileSync(proposal, "utf8")
      .replace(/## What\r?\n\r?\n<!--[\s\S]*?-->\r?\n/, "## What\n\nThe CI matrix gains Node 24.\n"));
    const tasks = path.join(change, "tasks.md");
    writeFileSync(tasks, readFileSync(tasks, "utf8").replace(/(- \[ \]\r?\n){3}/, "- [ ] Add Node 24 to the matrix.\n"));
    assert.equal(runCli(["change", "tick", "0001-chore", "--all"], dir).status, 0);

    const close = runCli(["close", "0001-chore"], dir);
    assert.equal(close.status, 0, close.stdout + close.stderr);
    assert.match(close.stdout, /closed — verified, archived and validated/);
    assert.ok(!existsSync(change), "archived out of the read path");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
