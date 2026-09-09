import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { refExists, historyState } from "../src/lib/git.js";

// Change 0092 — the review does not approve against what does not exist.
//
// On a tree with two real changes:
//
//     doctrina review --diff HEAD                     -> 2 breaks
//     doctrina review --diff nao-existe --strict      -> "no changes", exit 0
//
// A ref git cannot resolve is a filter matching nothing, and the review read
// it as "nothing changed". The root cause is one message doing two jobs: git
// says "unknown revision or path not in the working tree" both for a
// repository with no commits and for a missing ref, so `git()` classified the
// failed diff as EMPTY and every caller read it as an empty answer.
//
// A CI job running `doctrina review --diff main --strict` therefore passed
// forever on a shallow clone with no local `main`. The review is the
// conformance gate and runs inside every close.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function git(cwd, args) {
  execFileSync("git", args, { cwd, stdio: "pipe" });
}

// A project with history and an uncommitted change, so a valid ref has
// something real to report.
function repoWithChanges() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-ref-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira"]).status, 0);
  assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
  assert.equal(run(dir, ["index", "rebuild"]).status, 0);
  git(dir, ["init", "-q"]);
  git(dir, ["config", "user.email", "t@example.com"]);
  git(dir, ["config", "user.name", "t"]);
  mkdirSync(path.join(dir, "src"), { recursive: true });
  writeFileSync(path.join(dir, "src", "carteira.js"), "export const a = 1;\n");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-qm", "base"]);
  // Modify a TRACKED file: `--diff <ref>` deliberately ignores untracked ones,
  // since the question there is what the branch changed.
  writeFileSync(path.join(dir, "src", "carteira.js"), "export const a = 2;\n");
  return dir;
}

test("a ref the repository cannot resolve is refused, not read as no changes", () => {
  const dir = repoWithChanges();
  try {
    // The fixture must genuinely have something to report, or this proves
    // nothing: a valid ref sees the change.
    const valid = run(dir, ["review", "--diff", "HEAD"]);
    assert.match(valid.stdout, /changed path\(s\)/);

    const bad = run(dir, ["review", "--diff", "branch-que-nao-existe", "--strict"]);
    assert.equal(bad.status, 2, "a usage error, not a clean review");
    assert.match(bad.stderr, /--diff names a ref this repository cannot resolve/);
    assert.doesNotMatch(bad.stdout, /no changes between/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a valid ref still reports exactly what it reported", () => {
  const dir = repoWithChanges();
  try {
    const out = run(dir, ["review", "--diff", "HEAD"]);
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.match(out.stdout, /Review — vs HEAD/);
    assert.match(out.stdout, /changed path\(s\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a valid ref with no difference is still an empty diff, not an error", () => {
  const dir = repoWithChanges();
  try {
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-qm", "second"]);   // the modification is now in HEAD
    const out = run(dir, ["review", "--diff", "HEAD"]);
    assert.equal(out.status, 0);
    assert.match(out.stdout, /no changes between HEAD and the working tree/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("outside a git repository the command still stays silent", () => {
  // The gate cannot see what moved, so it reports nothing rather than
  // accusing — that behaviour must survive the fix.
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-ref-"));
  try {
    assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
      "--intake-text", "uma carteira"]).status, 0);
    assert.equal(historyState(dir).usable, false);
    const out = run(dir, ["review", "--diff", "main"]);
    assert.equal(out.status, 0);
    assert.doesNotMatch(out.stderr, /cannot resolve/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("refExists answers the question the message heuristic could not", () => {
  const dir = repoWithChanges();
  try {
    assert.equal(refExists(dir, "HEAD"), true);
    assert.equal(refExists(dir, "branch-que-nao-existe"), false);
    // A repository with no commits and a missing ref share git's wording;
    // this must not confuse them into one answer.
    const empty = mkdtempSync(path.join(os.tmpdir(), "doctrina-ref-empty-"));
    try {
      git(empty, ["init", "-q"]);
      assert.equal(refExists(empty, "HEAD"), false);
      assert.equal(refExists(empty, "whatever"), false);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
