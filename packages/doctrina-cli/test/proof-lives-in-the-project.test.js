import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Change 0106 — a prova mora no projeto.
//
// Coverage resolved a citation with `path.resolve(projectRoot, token)` and
// accepted anything `exists` said yes to. Measured in a clean project:
//
//   verified by `../adopt/app.py`          → linked
//   verified by `C:/Windows/notepad.exe`   → linked
//   verified by `tests/`                   → linked (a directory)
//   verified by `tests/nope.py` and `tests/test_x.py` → covered, nope.py never mentioned
//
// Evidence is a file inside the project. A path outside the root or a
// directory is reported as dangling with the reason; a directory named next
// to a real proof is a prose mention and stays silent; and a criterion that
// cites one path that resolves and one that does not is covered, with the
// one that does not named.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project(criteria) {
  const parent = mkdtempSync(path.join(os.tmpdir(), "doctrina-proof-"));
  const outsideAbs = path.join(parent, "other", "app.py").replaceAll("\\", "/");
  criteria = criteria.map((line) => line.replace("<ABS>", outsideAbs));
  const dir = path.join(parent, "adopt");
  mkdirSync(dir);
  // A neighbour outside the project root, with a real file in it.
  mkdirSync(path.join(parent, "other"));
  writeFileSync(path.join(parent, "other", "app.py"), "x = 1\n");
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira de investimentos"]).status, 0);
  assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
  mkdirSync(path.join(dir, "tests"));
  writeFileSync(path.join(dir, "tests", "test_carteira.py"), "def test_a():\n    assert True\n");
  const specPath = path.join(dir, ".doctrina", "specs", "carteira", "spec.md");
  const text = readFileSync(specPath, "utf8")
    .replace("**Status:** draft", "**Status:** active")
    .replace("**Implementation:** planned", "**Implementation:** partial")
    .replace(/\*\*Realizes:\*\*[^\r\n]*/, "**Realizes:** n/a — fixture")
    .replace(/1\. \[unverified\] <observable signal>[^\r\n]*/, criteria.join("\n"));
  writeFileSync(specPath, text);
  assert.equal(run(dir, ["validate", "--fix"]).status, 0);
  return dir;
}

test("a path outside the project, an absolute path and a directory are not evidence", () => {
  const dir = project([
    "1. [verified] outside — verified by `../other/app.py`.",
    "2. [verified] absolute — verified by `<ABS>`.",
    "3. [verified] directory — verified by `tests/`.",
    "4. [verified] real — verified by `tests/test_carteira.py`.",
  ]);
  const res = run(dir, ["coverage", "--strict"]);
  assert.equal(res.status, 1);
  assert.match(res.stdout, /carteira\s+1\/4 criteria\s+\(3 dangling\)/);
  assert.match(res.stdout, /#1  evidence not found on disk: `\.\.\/other\/app\.py \(outside the project\)`/);
  assert.match(res.stdout, /#2  evidence not found on disk: `.*\(outside the project\)`/);
  assert.match(res.stdout, /#3  evidence not found on disk: `tests\/ \(a directory, not a file\)`/);
});

test("one citation resolving does not make the other one true, and it is named", () => {
  const dir = project([
    "1. [verified] two cites — verified by `tests/nope.py` and `tests/test_carteira.py`.",
    "2. [verified] a mention — every file under `tests/` is covered by `tests/test_carteira.py`.",
  ]);
  const res = run(dir, ["coverage", "--strict"]);
  assert.equal(res.status, 0, "linked evidence is linked");
  assert.match(res.stdout, /carteira\s+2\/2 criteria/);
  assert.match(res.stdout, /#1  also cites evidence that does not resolve: `tests\/nope\.py`/);
  assert.doesNotMatch(res.stdout, /#2 /, "a directory next to a real proof is a prose mention");
});
