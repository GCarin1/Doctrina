import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { GIT_STATE, historyState } from "../src/lib/git.js";

// Change 0080 — the report names the actual cause.
//
// In a freshly `git init`ed repository, `doctrina report` said "no git
// history available (not a repository, or git not installed)". Both causes
// were false: it IS a repository and git IS installed — it simply had no
// commits. `metrics`, reading the same state through `lib/git.js`, said so
// correctly. Two views of one tree disagreeing about one condition, and the
// one that erred sent the reader hunting an installation problem.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project({ repo = false, commit = false } = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-gitstate-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira"]).status, 0);
  if (repo) {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    execFileSync("git", ["config", "user.email", "t@example.com"], { cwd: dir });
    execFileSync("git", ["config", "user.name", "t"], { cwd: dir });
    if (commit) {
      execFileSync("git", ["add", "-A"], { cwd: dir });
      execFileSync("git", ["commit", "-qm", "base"], { cwd: dir });
    }
  }
  return dir;
}

const gitSection = (dir) => {
  const out = run(dir, ["report"]).stdout;
  const i = out.indexOf("## Git");
  assert.ok(i >= 0, `report printed no git section:\n${out}`);
  return out.slice(i);
};

test("a repository with no commits is reported as exactly that", () => {
  const dir = project({ repo: true });
  try {
    assert.equal(historyState(dir).state, GIT_STATE.EMPTY);
    const section = gitSection(dir);
    assert.match(section, /no commits yet/);
    // The two causes that are NOT true must not be named.
    assert.doesNotMatch(section, /not a repository/);
    assert.doesNotMatch(section, /not installed/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("outside a repository, that is what it says", () => {
  const dir = project();
  try {
    assert.equal(historyState(dir).state, GIT_STATE.NOT_A_REPO);
    const section = gitSection(dir);
    assert.match(section, /not a git repository/);
    assert.doesNotMatch(section, /no commits yet/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("with history, the section reports the window as before", () => {
  const dir = project({ repo: true, commit: true });
  try {
    assert.equal(historyState(dir).usable, true);
    const section = gitSection(dir);
    assert.match(section, /commits: \d+/);
    assert.doesNotMatch(section, /no git history/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("report and metrics agree about the state of one repository", () => {
  // The defect was not only a wrong sentence: it was two views of one tree
  // reaching different conclusions about the same condition.
  const dir = project({ repo: true });
  try {
    const reason = historyState(dir).reason;
    assert.match(gitSection(dir), new RegExp(reason.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(run(dir, ["metrics"]).stdout + run(dir, ["metrics"]).stderr,
      /no commits yet/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("status --view report carries the same sentence", () => {
  // The view is shared, so the fix has to reach both of its callers.
  const dir = project({ repo: true });
  try {
    const out = run(dir, ["status", "--view", "report"]);
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.match(out.stdout, /no commits yet/);
    assert.doesNotMatch(out.stdout, /not installed/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
