// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { collectStagedIndexDrift } from "../src/lib/scan.js";

// THE INDEX HAS TO DESCRIBE THE COMMIT, NOT THE DISK.
//
// `index.json` is derived from the WHOLE tree, so it cannot describe a
// subset of one. Open two changes, stage one of them, and the index riding
// along in that commit names a folder the commit does not carry. Everything
// that could catch it reads the working tree — `validate`, `index rebuild
// --check`, every step of `close` — and on your disk both folders are still
// sitting there, so all of them pass.
//
// Four consecutive commits of this repository shipped that way. Each closed
// green; each went red on checkout with "index.json references missing
// artifact", and nothing between the close and the CI run asked the only
// question that mattered: what is actually in this commit?

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function sh(dir, args) {
  return execFileSync("git", ["-c", "user.email=t@e.com", "-c", "user.name=T",
    "-c", "commit.gpgsign=false", ...args], { cwd: dir, encoding: "utf8" });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-staged-"));
  assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
  sh(dir, ["init", "-q"]);
  sh(dir, ["add", "-A"]);
  sh(dir, ["commit", "-qm", "init"]);
  return dir;
}

function openChange(dir, prompt, id) {
  const r = runCli(["work", prompt, "--id", id, "--title", id.slice(5), "--quiet"], dir);
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return path.join(dir, ".doctrina", "changes", id);
}

test("a whole-tree commit passes the staged check", () => {
  const dir = project();
  try {
    openChange(dir, "mudar uma coisa", "0001-uma");
    sh(dir, ["add", "-A"]);
    const r = runCli(["index", "rebuild", "--check", "--staged"], dir);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /matches the staged tree/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a partial commit of .doctrina/ is refused, and names what is absent", () => {
  const dir = project();
  try {
    openChange(dir, "mudar uma coisa", "0001-uma");
    openChange(dir, "mudar outra coisa", "0002-outra");
    // The shape of the mistake: the index knows both changes, the commit
    // carries only one.
    sh(dir, ["add", ".doctrina/index.json", ".doctrina/changes/0001-uma"]);

    const state = collectStagedIndexDrift(dir);
    assert.equal(state.ok, false);
    assert.deepEqual(state.missing, ["changes: .doctrina/changes/0002-outra"]);

    const r = runCli(["index", "rebuild", "--check", "--staged"], dir);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /0002-outra/);
    assert.match(r.stdout, /absent from the commit/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The mirror: the artifact is in the commit and the index riding along
// predates it. Same inconsistency, read from the other end.
test("an artifact staged without its index entry is refused too", () => {
  const dir = project();
  try {
    openChange(dir, "mudar uma coisa", "0001-uma");
    // Stage the folder, but put back the index from HEAD, which never
    // heard of it.
    sh(dir, ["add", ".doctrina/changes/0001-uma"]);
    const state = collectStagedIndexDrift(dir);
    assert.equal(state.ok, false);
    assert.deepEqual(state.unindexed, [".doctrina/changes/0001-uma"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the check is inert where it has nothing to say", () => {
  const dir = project();
  try {
    // Nothing staged at all: this commit carries no index, so it cannot
    // carry one that disagrees with itself.
    writeFileSync(path.join(dir, "note.txt"), "hello\n");
    sh(dir, ["add", "note.txt"]);
    const r = runCli(["index", "rebuild", "--check", "--staged"], dir);
    assert.equal(r.status, 0, r.stdout + r.stderr);

    // And outside a repository it says so instead of throwing.
    const bare = mkdtempSync(path.join(os.tmpdir(), "doctrina-nogit-"));
    try {
      assert.equal(runCli(["init", "--non-interactive", "--project-name", "B"], bare).status, 0);
      assert.equal(runCli(["index", "rebuild", "--check", "--staged"], bare).status, 0);
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--staged never writes: without --check it is a usage error", () => {
  const dir = project();
  try {
    const r = runCli(["index", "rebuild", "--staged"], dir);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stderr, /can only check/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The hook is where this question gets asked in practice, and it has to be
// asked AFTER the step that stages the index.
test("the installed pre-commit hook asks the staged question, after staging", () => {
  const dir = project();
  try {
    assert.equal(runCli(["hooks", "install"], dir).status, 0);
    const hook = readFileSync(path.join(dir, ".git", "hooks", "pre-commit"), "utf8");
    const add = hook.indexOf("git add .doctrina/index.json");
    const check = hook.indexOf("--check --staged");
    assert.ok(add >= 0, "precondition: the hook stages the repaired index");
    assert.ok(check > add,
      "the staged check must run after the step that stages the index, or it "
      + "measures a commit the hook is about to change");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
