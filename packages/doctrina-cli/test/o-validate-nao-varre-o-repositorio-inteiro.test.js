// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { walk } from "../src/lib/fs-ops.js";
import { filesMatching } from "../src/lib/runtime.js";

// VALIDATE DOES NOT WALK THE WHOLE REPOSITORY FOR ONE PATTERN (change 0249).
//
// Profiled on this repository: `validate` spent 411 of 654 ms resolving the
// specs' `**Source:**` patterns. Seven of them name a file at the root —
// `tsconfig.json`, `CHANGELOG.md` — and each walked the entire tree to find
// it, `node_modules` and `.git` included, with two `stat` calls per entry.
// A pattern with no `**` names a fixed number of levels, and the directory
// listing already says which entries are directories.

function tree() {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-walk-"));
  const file = (/** @type {string} */ rel) => {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), "");
  };
  for (const rel of ["tsconfig.json", "README.md", "README.pt.md", "src/a.js", "src/b.ts", "src/lib/c.js", "src/lib/deep/d.js",
    "pkg/one/src/main.js", "pkg/two/src/main.js", "pkg/src/main.js", "node_modules/x/tsconfig.json", "node_modules/x/y/z/index.js"]) file(rel);
  const match = (/** @type {string} */ glob) => filesMatching(root, glob).map((f) => path.relative(root, f).split(path.sep).join("/"));
  return { root, match, done: () => rmSync(root, { recursive: true, force: true }) };
}

test("a pattern matches what it matched, however far the walk goes", () => {
  const t = tree();
  try {
    assert.deepEqual(t.match("tsconfig.json"), ["tsconfig.json"], "the one at the root, not the one a dependency ships");
    assert.deepEqual(t.match("README*.md"), ["README.md", "README.pt.md"]);
    assert.deepEqual(t.match("src/*.js"), ["src/a.js"], "`*` stays inside one directory");
    assert.deepEqual(t.match("src/{a,b}.{js,ts}"), ["src/a.js", "src/b.ts"]);
    assert.deepEqual(t.match("src/**/*.js"), ["src/a.js", "src/lib/c.js", "src/lib/deep/d.js"], "`**` still spans directories");
    assert.deepEqual(t.match("src/lib/"), ["src/lib/c.js", "src/lib/deep/d.js"], "a directory claims what is under it");
    assert.deepEqual(t.match("missing/*.js"), []);
    // A literal segment AFTER a wildcard is not part of the prefix: the walk
    // used to start from `pkg/src` because that directory happens to exist.
    assert.deepEqual(t.match("pkg/*/src/main.js"), ["pkg/one/src/main.js", "pkg/two/src/main.js"]);
  } finally {
    t.done();
  }
});

test("the walk goes no deeper than it is asked to, and still follows a link", () => {
  const t = tree();
  try {
    const rel = (/** @type {string[]} */ files) => files.map((f) => path.relative(t.root, f).split(path.sep).join("/"));
    assert.deepEqual(rel(walk(t.root, { depth: 1 })), ["README.md", "README.pt.md", "tsconfig.json"]);
    assert.deepEqual(rel(walk(path.join(t.root, "src"), { depth: 2 })), ["src/a.js", "src/b.ts", "src/lib/c.js"]);
    assert.equal(walk(t.root).length, 12, "unbounded by default, as every other caller expects");
    assert.deepEqual(walk(path.join(t.root, "nowhere")), []);
    if (process.platform !== "win32") {
      symlinkSync(path.join(t.root, "src", "lib"), path.join(t.root, "linked"));
      symlinkSync(path.join(t.root, "nowhere"), path.join(t.root, "dangling"));
      assert.deepEqual(rel(walk(path.join(t.root, "linked"))), ["linked/c.js", "linked/deep/d.js"]);
      assert.ok(rel(walk(t.root)).includes("linked/c.js"), "a linked directory is walked, as it was");
      assert.ok(!rel(walk(t.root)).some((f) => f.startsWith("dangling")), "a link to nothing is neither a file nor a directory");
    }
  } finally {
    t.done();
  }
});
