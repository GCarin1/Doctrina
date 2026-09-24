// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkChangelogImpact } from "../src/lib/docs-impact.js";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";

// DOCUMENTATION SAYS HOW IT WORKS; A CHANGELOG SAYS THAT IT CHANGED.
//
// The second is not answered by the first: prose describing new behaviour
// reads exactly like prose that always described it. Nothing asked for the
// changelog, so it drifted immediately — thirteen changes landed in one
// session, every one through `close`, and `## [Unreleased]` was still empty
// at the end of it, under a file whose first line says every notable change
// is recorded there.

function project({ changelog = true, surface = true } = {}) {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-clog-"));
  const changeDir = path.join(tmp, ".doctrina", "changes", "0001-add-flag");
  mkdirSync(changeDir, { recursive: true });
  writeFileSync(path.join(changeDir, "proposal.md"), [
    "# Change 0001-add-flag — add a flag",
    "",
    "- **Status:** proposed",
    "",
    "## Why",
    "",
    surface
      ? "`doctrina validate` gains a `--strict` flag."
      : "Tidy an internal helper that nothing outside this file calls.",
    "",
  ].join("\n"));
  if (changelog) writeFileSync(path.join(tmp, "CHANGELOG.md"), "# Changelog\n\n## [Unreleased]\n");
  spawnSync("git", ["init", "-q"], { cwd: tmp });
  spawnSync("git", ["config", "user.email", "t@example.com"], { cwd: tmp });
  spawnSync("git", ["config", "user.name", "t"], { cwd: tmp });
  spawnSync("git", ["add", "-A"], { cwd: tmp });
  spawnSync("git", ["commit", "-qm", "base"], { cwd: tmp });
  return { tmp, changeDir };
}

test("a change that alters a documented surface must say so in the changelog", () => {
  const { tmp, changeDir } = project();
  try {
    const r = checkChangelogImpact(tmp, changeDir);
    assert.equal(r.ok, false, `expected a refusal, got: ${r.reason}`);
    assert.match(r.reason, /CHANGELOG\.md does not say so/);
    assert.ok(r.signals.length > 0, "the refusal must name what it saw change");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("touching the changelog satisfies it", () => {
  const { tmp, changeDir } = project();
  try {
    writeFileSync(path.join(tmp, "CHANGELOG.md"),
      "# Changelog\n\n## [Unreleased]\n\n### Added\n\n- `validate --strict`.\n");
    const r = checkChangelogImpact(tmp, changeDir);
    assert.equal(r.ok, true, r.reason);
    assert.match(r.reason, /recorded in CHANGELOG\.md/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("a change that touches no documented surface is never asked", () => {
  const { tmp, changeDir } = project({ surface: false });
  try {
    const r = checkChangelogImpact(tmp, changeDir);
    assert.equal(r.ok, true, r.reason);
    assert.match(r.reason, /touches no documented surface/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// The gate reports a promise the project MADE. A project that keeps no
// changelog never promised anything, and inventing the obligation for it is
// exactly the portability bug change 0058 fixed for the docs remedy.
test("a project with no changelog is not given one to keep", () => {
  const { tmp, changeDir } = project({ changelog: false });
  try {
    const r = checkChangelogImpact(tmp, changeDir);
    assert.equal(r.ok, true, r.reason);
    assert.match(r.reason, /no CHANGELOG\.md in this project/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
