// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// `upgrade` WAS ALREADY `templates update`, PLUS AN INDEX AND A VALIDATE.
//
// Its first step ran `templates update` verbatim, and `templates check` was
// that same step without the power to fix — except for one gap: the check
// also reported what NO command repairs (a hub pointer that lost its link to
// AGENTS.md, a broken playbook), and the upgrade never printed those. So
// `upgrade` said "nothing to upgrade" over a project `templates check`
// failed. The upgrade now lists them, each with its fix, and both templates
// operations are deprecated in its favour (ADR 0026: redundancy, shown by a
// test).

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

// A project with one finding the update can fix (a missing recommended
// section) and one it cannot (a hub pointer that no longer names AGENTS.md).
function driftedProject() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-upgrade-merge-"));
  assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme", "--agent", "cursor"], dir).status, 0);
  const agents = path.join(dir, "AGENTS.md");
  writeFileSync(agents, readFileSync(agents, "utf8").replace(/^## Commands\r?\n/m, ""));
  const pointer = path.join(dir, ".cursor", "rules", "00-doctrina.mdc");
  writeFileSync(pointer, readFileSync(pointer, "utf8").replace(/AGENTS\.md/g, "NOTHING.md"));
  return dir;
}

const findings = (out) => out.split(/\r?\n/).filter((l) => l.startsWith("✗ ")).map((l) => l.slice(2));

test("the upgrade preview reports every finding templates check reported", () => {
  const dir = driftedProject();
  try {
    const check = runCli(["templates", "check"], dir);
    const upgrade = runCli(["upgrade"], dir);
    assert.equal(check.status, 1);
    assert.equal(upgrade.status, 1, "a finding left is not 'nothing to upgrade'");
    for (const f of findings(check.stdout)) {
      const fixable = /missing recommended section "## Commands"/.test(f);
      assert.ok(fixable
        ? /would\s+AGENTS\.md: append stub section "## Commands"/.test(upgrade.stdout)
        : upgrade.stdout.includes(f), `upgrade does not report: ${f}`);
    }
    assert.match(upgrade.stdout, /fix: doctrina adapter add cursor --force/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("upgrade --write writes what templates update --write wrote, and stays red on a manual repair", () => {
  const a = driftedProject();
  const b = mkdtempSync(path.join(os.tmpdir(), "doctrina-upgrade-merge-"));
  try {
    cpSync(a, b, { recursive: true });
    assert.equal(runCli(["templates", "update", "--write"], a).status, 0);
    const up = runCli(["upgrade", "--write"], b);
    assert.equal(readFileSync(path.join(b, "AGENTS.md"), "utf8"), readFileSync(path.join(a, "AGENTS.md"), "utf8"));
    assert.equal(up.status, 1, "the drifted pointer is still there");
    assert.match(up.stdout, /manual repairs left/);
    // Repaired by the fix it named, the upgrade goes green.
    assert.equal(runCli(["adapter", "add", "cursor", "--force"], b).status, 0);
    assert.equal(runCli(["upgrade"], b).status, 0);
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

test("both templates operations still work, warn on stderr, and name the upgrade", () => {
  const dir = driftedProject();
  try {
    const check = runCli(["templates", "check"], dir);
    assert.match(check.stderr, /deprecated:.*doctrina upgrade/);
    const update = runCli(["templates", "update"], dir);
    assert.match(update.stderr, /deprecated:.*doctrina upgrade --write/);
    assert.doesNotMatch(runCli(["upgrade"], dir).stderr, /deprecated/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
