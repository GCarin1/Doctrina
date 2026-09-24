// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// AN UPGRADE SEES THE SLASH COMMAND THE LAST CLI LEFT BEHIND.
//
// A slash-command shim is copied into the project once. After 0.17
// deprecated `analyze` and handed apply/archive to the close, a project
// scaffolded by 0.16 kept a `/doctrina-work` that ran `analyze` →
// `change apply`, and `upgrade` said nothing to upgrade: the agent kept
// the old flow with no one told. The upgrade now names a shim that teaches
// a retired command, with the rewrite that repairs it — and the repair
// clears it (a remedy that cannot resolve its finding is not one).

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

// The 0.16 shim's step, verbatim.
const OLD_STEP = "   `tasks.md`, implement, then `doctrina analyze <id>` → `doctrina change apply <id>`.\n";

test("the upgrade names a shim that teaches a deprecated command, and its fix clears it", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-stale-shim-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme", "--agent", "claude"], dir).status, 0);
    assert.equal(runCli(["upgrade"], dir).status, 0, "a fresh project has nothing to upgrade");

    const shim = path.join(dir, ".claude", "commands", "doctrina-work.md");
    writeFileSync(shim, readFileSync(shim, "utf8") + OLD_STEP);
    const up = runCli(["upgrade"], dir);
    assert.equal(up.status, 1, "a stale shim is not 'nothing to upgrade'");
    assert.match(up.stdout, /\.claude\/commands\/doctrina-work\.md still teaches `doctrina analyze`, which this CLI deprecated/);
    assert.match(up.stdout, /fix: doctrina adapter add claude --force/);

    assert.equal(runCli(["adapter", "add", "claude", "--force"], dir).status, 0);
    assert.doesNotMatch(readFileSync(shim, "utf8"), /doctrina analyze/);
    assert.equal(runCli(["upgrade"], dir).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("change check titles its first section by the gate, not the deprecated command", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-stale-shim-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
    assert.equal(runCli(["change", "new", "0001-x", "Do x"], dir).status, 0);
    const out = runCli(["change", "check", "0001-x"], dir).stdout;
    assert.match(out, /^──── 1\/3 structure$/m);
    assert.doesNotMatch(out, /analyze/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
