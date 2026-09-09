import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { deriveImplementation, derivedImplementations } from "../src/lib/coverage-model.js";

// Change 0105 — a marca [unverified] vale.
//
// Criterion 2 was marked [unverified] and cited a test file that exists.
// `validate` said "2/2 criteria have resolving proof, which supports
// verified", `spec set --implementation auto` wrote `verified`, and `why`
// alone printed ○ for the same criterion. The author had said, in the one
// place the format gives them, "not verified"; the arithmetic overruled the
// sentence. Linked is not certified: the derived state stops at
// `implemented` — the ladder's rung for "the code is there; I have not
// certified it" — until the mark is flipped.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-mark-"));
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
    .replace(/1\. \[unverified\] <observable signal>[^\r\n]*/,
      "1. [verified] one — verified by `tests/test_carteira.py`.\n2. [unverified] two — verified by `tests/test_carteira.py`.");
  writeFileSync(specPath, text);
  assert.equal(run(dir, ["validate", "--fix"]).status, 0);
  return { dir, specPath };
}

test("the arithmetic stops at implemented while a covered criterion is still marked [unverified]", () => {
  assert.equal(deriveImplementation({ total: 2, covered: 2, dangling: 0, conditional: 0, unguarded: 0, deferred: 0, unverified: 1 }), "implemented");
  assert.equal(deriveImplementation({ total: 2, covered: 2, dangling: 0, conditional: 0, unguarded: 0, deferred: 0, unverified: 0 }), "verified");
  assert.equal(deriveImplementation({ total: 2, covered: 1, dangling: 1, conditional: 0, unguarded: 0, deferred: 0, unverified: 1 }), "partial");
});

test("validate, spec set --implementation auto and coverage all read the mark", () => {
  const { dir, specPath } = project();
  const row = derivedImplementations(dir).get("carteira");
  assert.equal(row.derived, "implemented");
  assert.equal(row.unverified, 1);

  const validate = run(dir, ["validate"]);
  assert.match(validate.stdout, /2\/2 criteria have resolving proof and 1 of them is still marked \[unverified\], which supports "implemented"/);

  const coverage = run(dir, ["coverage", "--strict"]);
  assert.equal(coverage.status, 0, "linked evidence still counts for the gate");
  assert.match(coverage.stdout, /carteira\s+2\/2 criteria/);
  assert.match(coverage.stdout, /○ #2  proof resolves but the criterion is still marked \[unverified\]/);

  assert.equal(run(dir, ["spec", "set", "carteira", "--implementation", "auto"]).status, 0);
  assert.match(readFileSync(specPath, "utf8"), /\*\*Implementation:\*\* implemented/);

  // Flip the mark, and the same doors now read verified.
  assert.equal(run(dir, ["spec", "set", "carteira", "--criterion", "2:verified"]).status, 0);
  assert.equal(run(dir, ["spec", "set", "carteira", "--implementation", "auto"]).status, 0);
  assert.match(readFileSync(specPath, "utf8"), /\*\*Implementation:\*\* verified/);
  assert.doesNotMatch(run(dir, ["coverage"]).stdout, /still marked/);
});
