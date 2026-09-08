import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { walk, pruneEmptyDirs } from "../src/lib/fs-ops.js";

// Change 0073 — `adapter remove` leaves no trace.
//
// `adapter add` calls mkdirp on the way in; `remove` deleted the six files
// and left `.claude/` and `.claude/commands/` behind — zero files, two
// directories. An empty `.claude/` is not neutral: it is a configuration
// root the next agent finds and treats as present, which is the opposite of
// what a command promising symmetry with `add` should leave behind.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-adapter-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  return dir;
}

// Every path under the tree, directories included — a file listing alone
// cannot see the defect this change is about.
function entries(root) {
  const out = new Set();
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, name.name);
      out.add(path.relative(root, full).replaceAll("\\", "/"));
      if (name.isDirectory()) stack.push(full);
    }
  }
  return out;
}

test("add then remove returns the tree to what it was — directories included", () => {
  const dir = project();
  try {
    const before = entries(dir);
    assert.equal(run(dir, ["adapter", "add", "claude"]).status, 0);
    assert.ok(existsSync(path.join(dir, ".claude", "commands")), "add creates the subdirectory");

    const out = run(dir, ["adapter", "remove", "claude"]);
    assert.equal(out.status, 0);
    assert.match(out.stdout, /2 empty directories pruned/);

    assert.deepEqual([...entries(dir)].sort(), [...before].sort());
    assert.equal(existsSync(path.join(dir, ".claude")), false,
      "an empty .claude/ is a configuration root, not an absence");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a directory holding someone else's file survives the removal", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["adapter", "add", "claude"]).status, 0);
    const mine = path.join(dir, ".claude", "settings.json");
    writeFileSync(mine, "{}\n");

    const out = run(dir, ["adapter", "remove", "claude"]);
    assert.equal(out.status, 0);
    assert.equal(existsSync(mine), true, "a file the adapter never wrote is not its to remove");
    assert.equal(existsSync(path.join(dir, ".claude")), true);
    // The empty subdirectory still goes: nothing of the user's was in it.
    assert.equal(existsSync(path.join(dir, ".claude", "commands")), false);
    assert.match(out.stdout, /1 empty directory pruned/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a kept (edited) file keeps its whole directory chain", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["adapter", "add", "claude"]).status, 0);
    const edited = path.join(dir, ".claude", "commands", "doctrina-work.md");
    writeFileSync(edited, `${readFileSync(edited, "utf8")}\n<!-- mine -->\n`);

    const out = run(dir, ["adapter", "remove", "claude"]);
    assert.equal(out.status, 0);
    assert.match(out.stdout, /1 kept \(edited\)/);
    assert.equal(existsSync(edited), true);
    assert.equal(existsSync(path.join(dir, ".claude", "commands")), true);
    assert.equal(existsSync(path.join(dir, ".claude")), true);
    assert.doesNotMatch(out.stdout, /director(y|ies) pruned/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("pruneEmptyDirs never escapes or removes its boundary", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-prune-"));
  try {
    const deep = path.join(root, "a", "b", "c");
    mkdirSync(deep, { recursive: true });
    const removed = pruneEmptyDirs(deep, root);
    assert.deepEqual(removed.map((p) => path.relative(root, p).replaceAll("\\", "/")),
      ["a/b/c", "a/b", "a"]);
    assert.equal(existsSync(root), true, "the boundary itself is never removed");

    // Nothing outside the boundary is reachable, even when asked directly.
    assert.deepEqual(pruneEmptyDirs(path.dirname(root), root), []);
    assert.equal(existsSync(root), true);
    // And a directory that still holds something stops the walk at once.
    mkdirSync(path.join(root, "x", "y"), { recursive: true });
    writeFileSync(path.join(root, "x", "keep.txt"), "keep\n");
    assert.deepEqual(pruneEmptyDirs(path.join(root, "x", "y"), root).length, 1);
    assert.equal(existsSync(path.join(root, "x")), true);
    assert.equal(walk(root).length, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
