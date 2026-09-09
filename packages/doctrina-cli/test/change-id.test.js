import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { isChangeId, resolveWithinProject } from "../src/lib/project.js";

// Change 0094 — a change id is a directory name, so it has a grammar.
//
// `change new` was the only authoring command with none: it joined whatever
// string it was given onto a path. Two consequences, both found by running
// it (third audit, finding 1): a traversing id scaffolded the change OUTSIDE
// the project, against the `authoring` spec's own "shall not write outside
// the project working directory"; and ids like `0003-com espaco` were
// accepted here and then carried by `validate`, `index rebuild` and `next`
// as legitimate, producing a remediation line nobody could run.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

// A project nested one level down, so a traversing id has somewhere to
// escape TO that the test can then prove stayed empty.
function nestedProject() {
  const outer = mkdtempSync(path.join(os.tmpdir(), "doctrina-id-"));
  const dir = path.join(outer, "adopt");
  mkdirSync(dir, { recursive: true });
  const res = run(dir, ["init", "--non-interactive", "--project-name", "Acme"]);
  assert.equal(res.status, 0, res.stderr);
  return { outer, dir };
}

test("a traversing change id is refused and writes nothing outside the project", () => {
  const { outer, dir } = nestedProject();
  try {
    const before = readdirSync(outer).sort();
    const res = run(dir, ["change", "new", "../../../escaped/evil", "x"]);
    assert.equal(res.status, 2, "a bad id is a usage error, not a gate failure");
    assert.match(res.stderr, /invalid change id/);
    assert.deepEqual(readdirSync(outer).sort(), before, "nothing may appear beside the project");
    assert.ok(!existsSync(path.join(outer, "escaped")));
    assert.ok(!existsSync(path.join(path.dirname(outer), "escaped")));
  } finally {
    rmSync(outer, { recursive: true, force: true });
  }
});

test("an id with a space or an uppercase letter never reaches the tree", () => {
  const { outer, dir } = nestedProject();
  try {
    for (const bad of ["0003-com espaco", "0004-MAIUSCULA", "0005-ç", "-leading-hyphen", ""]) {
      const res = run(dir, ["change", "new", bad, "title"]);
      assert.equal(res.status, 2, `"${bad}" should be a usage error, got ${res.status}`);
    }
    const changes = path.join(dir, ".doctrina", "changes");
    const opened = readdirSync(changes).filter((e) => e !== "archive" && !e.startsWith("."));
    assert.deepEqual(opened, [], `no change folder may exist, found: ${opened.join(", ")}`);
  } finally {
    rmSync(outer, { recursive: true, force: true });
  }
});

test("the shape work derives is still accepted", () => {
  const { outer, dir } = nestedProject();
  try {
    const res = run(dir, ["change", "new", "0042-short-slug", "a real change"]);
    assert.equal(res.status, 0, res.stderr || res.stdout);
    assert.ok(existsSync(path.join(dir, ".doctrina", "changes", "0042-short-slug", "proposal.md")));
  } finally {
    rmSync(outer, { recursive: true, force: true });
  }
});

test("isChangeId is the change grammar, not the capability grammar", () => {
  // A change id may open on a digit — `work` derives `0042-...`. A capability
  // may not, and that rule lives with `spec new`. Two rules that look alike
  // are not one rule.
  assert.ok(isChangeId("0042-short-slug"));
  assert.ok(isChangeId("hotfix"));
  for (const bad of ["../evil", "with space", "UPPER", "ç", "-lead", "", null, undefined]) {
    assert.ok(!isChangeId(bad), `${JSON.stringify(bad)} must be refused`);
  }
});

test("resolveWithinProject refuses anything that escapes, whatever the shape", () => {
  const root = path.resolve("/tmp/project");
  assert.equal(
    resolveWithinProject(root, ".doctrina", "changes", "0001-x"),
    path.join(root, ".doctrina", "changes", "0001-x"),
  );
  // Two levels up from `.doctrina/changes/` lands back on the project root,
  // which is INSIDE — refusing that would be the bug. Only what actually
  // leaves is refused.
  assert.equal(
    resolveWithinProject(root, ".doctrina", "changes", "../../elsewhere"),
    path.join(root, "elsewhere"),
  );
  for (const escape of ["../../../elsewhere", path.resolve("/etc"), "../../../../.."]) {
    assert.throws(
      () => resolveWithinProject(root, ".doctrina", "changes", escape),
      /outside the project/,
      `"${escape}" must be refused`,
    );
  }
});
