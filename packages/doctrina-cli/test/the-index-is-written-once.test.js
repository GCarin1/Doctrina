// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// THE INDEX IS WRITTEN TWICE AND MUST COME OUT THE SAME.
//
// Once incrementally, by the command that creates the artifact, and once
// wholesale by `index rebuild`, which walks the directory and writes what it
// finds in `readdirSync(...).sort()` order. The two agreed only by luck:
// appending matches a sorted walk exactly when the new entry sorts last.
//
// It usually does, which is how this survived. `spec new alpha` after
// `spec new zebra` does not — two commands in a fresh project are enough — and
// neither does archiving change 0138 after 0139. That one shipped: all six
// test legs of CI went red on a tree whose own `close` had just reported green.
//
// `validate` cannot see it. Drift of this kind is only visible by rebuilding
// and comparing, which is a different gate, so the tree looked healthy from
// the inside and failed from the outside.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function project() {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-index-"));
  spawnSync("git", ["init", "-q"], { cwd: tmp });
  run(tmp, ["init", "--non-interactive", "--project-name", "Acme",
    "--project-description", "An index fixture"]);
  return tmp;
}

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

const ids = (cwd, category) =>
  JSON.parse(readFileSync(path.join(cwd, ".doctrina", "index.json"), "utf8"))
    .artifacts[category].map((/** @type {{id: string}} */ e) => e.id);

/** The gate the incremental writer has to satisfy. */
function assertNoDrift(cwd, what) {
  const r = run(cwd, ["index", "rebuild", "--check"]);
  assert.equal(r.status, 0, `${what} left the index drifted:\n${r.stdout}${r.stderr}`);
}

test("a spec that sorts before an existing one does not drift the index", () => {
  const tmp = project();
  try {
    run(tmp, ["spec", "new", "zebra"]);
    run(tmp, ["spec", "new", "alpha"]);
    run(tmp, ["spec", "new", "middle"]);
    assert.deepEqual(ids(tmp, "specs"), ["alpha", "middle", "zebra"],
      "the incremental writer must place each spec where the walk would");
    assertNoDrift(tmp, "spec new");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("a skill that sorts before an existing one does not drift the index", () => {
  const tmp = project();
  try {
    run(tmp, ["skill", "new", "zulu"]);
    run(tmp, ["skill", "new", "aardvark"]);
    assert.deepEqual(ids(tmp, "skills"), ["aardvark", "zulu"]);
    assertNoDrift(tmp, "skill new");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// The case that actually shipped. Closing out of numeric order is ordinary —
// a change can be parked, or unblocked by a later one, which is exactly what
// happened to 0138.
test("archiving changes out of order does not drift the index", () => {
  const tmp = project();
  try {
    run(tmp, ["change", "new", "0001-primeira", "a change"]);
    run(tmp, ["change", "new", "0002-segunda", "another change"]);
    run(tmp, ["change", "archive", "0002-segunda", "--force"]);
    run(tmp, ["change", "archive", "0001-primeira", "--force"]);
    assert.deepEqual(ids(tmp, "changes_archive"), ["0001-primeira", "0002-segunda"],
      "an archive entry belongs where its folder name sorts, not where it arrived");
    assertNoDrift(tmp, "change archive out of order");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// The incremental order must match the WALK's comparison, not a friendlier
// one: `readdirSync(...).sort()` takes the default comparator, which orders by
// UTF-16 code unit, while `localeCompare` reweights punctuation and would put
// these two the other way around.
test("ordering matches the directory walk, punctuation included", () => {
  const tmp = project();
  try {
    run(tmp, ["skill", "new", "a-b"]);
    run(tmp, ["skill", "new", "ab"]);
    run(tmp, ["skill", "new", "a-a"]);
    const written = ids(tmp, "skills");
    assert.deepEqual(written, [...written].sort(),
      `code-unit order is what the walk produces; got ${JSON.stringify(written)}`);
    assertNoDrift(tmp, "skill names differing only in punctuation");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
