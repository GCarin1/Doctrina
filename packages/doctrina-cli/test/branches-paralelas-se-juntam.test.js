// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { mergeIndex } from "../src/lib/index-merge.js";

// TWO BRANCHES THAT EACH CLOSED A CHANGE MERGE WITHOUT A MANUAL STEP (change 0242).
//
// Measured on this repository over ninety days: `.doctrina/index.json`
// changed in 172 of 186 commits and the ledger in 158. Every change rewrites
// both, so two branches always met on the same lines — conflict markers in a
// file that is derived, and in a list. And the next change number was read
// from the disk, so both branches opened `0001-…`.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const env = { ...process.env, NO_COLOR: "1" };
const cli = (/** @type {string} */ cwd, /** @type {string[]} */ args) => {
  const r = spawnSync(process.execPath, [cliEntry, ...args], { cwd, encoding: "utf8", env });
  return { status: r.status, out: r.stdout + r.stderr };
};
const git = (/** @type {string} */ cwd, /** @type {string[]} */ args) =>
  spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...args], { cwd, encoding: "utf8" });

function repository() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-branches-"));
  git(dir, ["init", "-q", "-b", "main"]);
  cli(dir, ["init", "--non-interactive", "--project-name", "team"]);
  writeFileSync(path.join(dir, ".doctrina", "verify.json"), JSON.stringify({ checks: [{ name: "ok", run: "node -e 0" }] }));
  return dir;
}

/** Open a chore on the current branch, written the way its playbook asks. */
function chore(dir, title) {
  const opened = cli(dir, ["work", "--chore", title, "--title", title, "--quiet"]);
  const id = String(opened.out.match(/opened (\d{4}-[a-z0-9-]+)/)?.[1]);
  const change = path.join(dir, ".doctrina", "changes", id);
  const proposal = path.join(change, "proposal.md");
  writeFileSync(proposal, readFileSync(proposal, "utf8")
    .replace(/## What\r?\n\r?\n<!--[\s\S]*?-->\r?\n/, `## What\n\nThe build gains ${title}.\n`));
  const tasks = path.join(change, "tasks.md");
  writeFileSync(tasks, readFileSync(tasks, "utf8").replace(/(- \[ \]\r?\n){3}/, `- [ ] Add ${title}.\n`));
  cli(dir, ["change", "tick", id, "--all"]);
  return id;
}

test("the index merges as lists of artifacts, and what both sides changed takes the newer value", () => {
  const spec = (/** @type {string} */ id, /** @type {string} */ version, /** @type {string} */ date) =>
    ({ id, path: `.doctrina/specs/${id}/spec.md`, version, last_updated: date });
  const archived = (/** @type {string} */ id) => ({ id, path: `.doctrina/changes/archive/2026-11-10-${id}` });
  const open = (/** @type {string} */ id) => ({ id, path: `.doctrina/changes/${id}`, status: "proposed" });
  const index = (/** @type {any} */ a, date = "2026-11-01", stamp = "0.21.0") =>
    ({ project: "p", framework_version: stamp, last_updated: date, artifacts: { product: { path: ".doctrina/product.md" }, ...a } });

  const base = index({ specs: [spec("auth", "0.1.0", "2026-11-01"), spec("pay", "0.1.0", "2026-11-01")], changes: [open("0001-a"), open("0002-b")], changes_archive: [] });
  const ours = index({ specs: [spec("auth", "0.2.0", "2026-11-09"), spec("pay", "0.1.0", "2026-11-01")], changes: [open("0002-b")], changes_archive: [archived("0001-a")] }, "2026-11-09");
  const theirs = index({ specs: [spec("auth", "0.10.0", "2026-11-08"), spec("pay", "0.2.0", "2026-11-10"), spec("mail", "0.1.0", "2026-11-10")], changes: [open("0001-a")], changes_archive: [archived("0002-b")] }, "2026-11-10", "0.22.0");

  const merged = mergeIndex(base, ours, theirs);
  assert.deepEqual(merged.artifacts.changes, [], "each side closed one: both are closed");
  assert.deepEqual(merged.artifacts.changes_archive.map((/** @type {any} */ c) => c.id), ["0001-a", "0002-b"]);
  assert.deepEqual(merged.artifacts.specs.map((/** @type {any} */ s) => `${s.id} ${s.version} ${s.last_updated}`),
    ["auth 0.10.0 2026-11-09", "mail 0.1.0 2026-11-10", "pay 0.2.0 2026-11-10"],
    "0.10.0 is later than 0.2.0, a date only moves forward, and the list is in the order a rebuild writes");
  assert.equal(merged.last_updated, "2026-11-10");
  assert.equal(merged.framework_version, "0.22.0", "the stamp never goes back");
  assert.deepEqual(mergeIndex({}, ours, ours), ours, "no common ancestor and no difference: nothing invented");
});

test("two branches that each closed a change merge with no conflict in the index or the ledger", () => {
  const dir = repository();
  try {
    const install = cli(dir, ["hooks", "install"]);
    assert.match(install.out, /wrote \.gitattributes — 2 lines/);
    assert.match(readFileSync(path.join(dir, ".gitattributes"), "utf8"),
      /^\*\*\/\.doctrina\/index\.json merge=doctrina-index\n\*\*\/\.doctrina\/changes\/archive\/LEDGER\.md merge=union$/m);
    assert.match(git(dir, ["config", "--get", "merge.doctrina-index.driver"]).stdout, /index\.js" index merge %O %A %B/);
    assert.doesNotMatch(cli(dir, ["hooks", "install", "--force"]).out, /wrote \.gitattributes/, "written once");
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-qm", "base", "--no-verify"]);

    // One change already in the ledger, so both branches append to a file that exists.
    assert.equal(cli(dir, ["close", chore(dir, "lint")]).status, 0);
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-qm", "lint", "--no-verify"]);

    for (const [branch, title] of [["alice", "cache"], ["bob", "matrix"]]) {
      git(dir, ["checkout", "-q", "-b", branch, "main"]);
      const closed = cli(dir, ["close", chore(dir, title)]);
      assert.equal(closed.status, 0, closed.out);
      git(dir, ["add", "-A"]);
      git(dir, ["commit", "-qm", title, "--no-verify"]);
    }
    git(dir, ["checkout", "-q", "main"]);
    assert.equal(git(dir, ["merge", "-q", "alice"]).status, 0);
    const merge = git(dir, ["merge", "bob", "-m", "merge bob"]);
    assert.equal(merge.status, 0, merge.stdout + merge.stderr);

    const ledger = readFileSync(path.join(dir, ".doctrina", "changes", "archive", "LEDGER.md"), "utf8");
    assert.doesNotMatch(ledger, /^[<=>]{7}/m);
    for (const title of ["lint", "cache", "matrix"]) assert.match(ledger, new RegExp(`\\d{4}-${title} — `), title);
    const check = cli(dir, ["index", "rebuild", "--check"]);
    assert.equal(check.status, 0, `the merged index is the one a rebuild derives: ${check.out}`);
    assert.equal(cli(dir, ["validate"]).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("without the driver the conflict is named, and a rebuild writes the index again", () => {
  const dir = repository();
  try {
    const file = path.join(dir, ".doctrina", "index.json");
    const text = readFileSync(file, "utf8");
    writeFileSync(file, text.replace(/("last_updated": )("[^"]+")/, '<<<<<<< HEAD\n$1$2\n=======\n$1"2020-01-01"\n>>>>>>> bob'));
    const status = cli(dir, ["validate"]);
    assert.match(status.out, /index\.json carries git's merge conflict markers — it is derived, so `doctrina index rebuild` writes it again/);
    assert.equal(cli(dir, ["index", "rebuild"]).status, 0);
    assert.equal(cli(dir, ["index", "rebuild", "--check"]).status, 0);

    const args = cli(dir, ["index", "merge", file]);
    assert.equal(args.status, 2, "three files, as git passes them");
    const bad = path.join(dir, "bad.json");
    writeFileSync(bad, "<<<<<<< not json");
    assert.equal(cli(dir, ["index", "merge", file, file, bad]).status, 1, "a side that is not JSON is left to git");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a number another branch already took is not handed out again", () => {
  const dir = repository();
  try {
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-qm", "base"]);
    git(dir, ["checkout", "-q", "-b", "alice"]);
    const first = chore(dir, "cache");
    assert.match(first, /^0001-/);
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-qm", "cache"]);
    git(dir, ["checkout", "-q", "main"]);
    assert.equal(existsSync(path.join(dir, ".doctrina", "changes", first)), false, "main does not hold alice's change");
    assert.match(chore(dir, "matrix"), /^0002-/, "git knows the branch, so the number is taken");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a merge that still brought two changes under one number is named, and renumber separates them", () => {
  const dir = repository();
  try {
    // Two clones that never saw each other's branch: the same number, twice.
    cli(dir, ["work", "--chore", "cache", "--id", "0001-cache", "--quiet"]);
    cli(dir, ["work", "--chore", "matrix", "--id", "0001-matrix", "--quiet"]);
    const validate = cli(dir, ["validate"]);
    assert.match(validate.out, /\.doctrina\/changes\/0001-matrix shares its number with 0001-cache — two branches opened them apart; `doctrina change renumber 0001-matrix`/);
    assert.doesNotMatch(validate.out, /changes\/0001-cache shares/, "one of the two moves, always the same one");

    const moved = cli(dir, ["change", "renumber", "0001-matrix"]);
    assert.equal(moved.status, 0, moved.out);
    assert.match(moved.out, /renumbered 0001-matrix → 0002-matrix/);
    const proposal = readFileSync(path.join(dir, ".doctrina", "changes", "0002-matrix", "proposal.md"), "utf8");
    assert.match(proposal, /^# Change 0002-matrix — /);
    assert.match(readFileSync(path.join(dir, ".doctrina", "changes", "0002-matrix", "tasks.md"), "utf8"), /^# Tasks — Change 0002-matrix/);
    assert.equal(existsSync(path.join(dir, ".doctrina", "changes", "0001-matrix")), false);
    assert.doesNotMatch(cli(dir, ["validate"]).out, /shares its number/);
    assert.equal(cli(dir, ["index", "rebuild", "--check"]).status, 0);
    assert.equal(cli(dir, ["change", "renumber", "0009-nothing"]).status, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
