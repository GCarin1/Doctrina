import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { setHeader, setCriterionMark, appendCriterion, STATUS_VALUES, IMPLEMENTATION_VALUES, CRITERION_MARKS } from "../src/lib/spec-ops.js";

// Change 0102 — os cabeçalhos têm um enum.
//
// `--version` and `--bump` always validated their input. `--status`,
// `--implementation` and `--criterion` wrote whatever string they were
// given, synced it into the index, and `validate` passed it with 0 errors —
// `prime` then reported "2 specs (1 partial, 1 banana)". Every gate branches
// on these words; a word outside the domain is a value no branch reads.
//
// The domain lives in one place (lib/spec-ops.js) and three doors read it:
// `spec set`, the `ops` block a delta applies, and `validate` for a value
// written by hand. A note after the state word stays legal.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-domain-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira de investimentos"]).status, 0);
  assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
  const specPath = path.join(dir, ".doctrina", "specs", "carteira", "spec.md");
  let text = readFileSync(specPath, "utf8");
  text = text.replace("**Status:** draft", "**Status:** active")
    .replace(/\*\*Realizes:\*\*[^\r\n]*/, "**Realizes:** n/a — fixture")
    .replace(/1\. \[unverified\] <observable signal>[^\r\n]*/, "1. [unverified] a signal — verified by `spec.md`.");
  writeFileSync(specPath, text);
  assert.equal(run(dir, ["validate", "--fix"]).status, 0);
  return { dir, specPath };
}

const SPEC = [
  "# Spec — x", "", "**Capability:** x", "**Status:** active", "**Implementation:** partial",
  "**Version:** 0.1.0", "", "## Acceptance criteria", "", "1. [verified] one — verified by `a.js`.", "",
].join("\n");

test("the domain is declared once and it is the ladder the docs describe", () => {
  assert.deepEqual(STATUS_VALUES, ["draft", "active", "deprecated"]);
  assert.deepEqual(IMPLEMENTATION_VALUES, ["planned", "partial", "implemented", "verified"]);
  assert.deepEqual(CRITERION_MARKS, ["verified", "unverified", "orchestration"]);
});

test("set-header refuses a word outside the domain and accepts a note after a legal one", () => {
  assert.match(setHeader(SPEC, "Status", "bogus").error, /Status must be one of draft\|active\|deprecated/);
  assert.match(setHeader(SPEC, "Implementation", "banana").error, /Implementation must be one of/);
  assert.equal(setHeader(SPEC, "Implementation", "planned — deferred, see ADR 0007").error, undefined);
  assert.equal(setHeader(SPEC, "Status", "deprecated").error, undefined);
  // Headers with no domain are untouched by the check.
  assert.equal(setHeader(SPEC, "Version", "9.9.9").error, undefined);
});

test("a criterion mark outside the domain is refused on set and on append", () => {
  assert.match(setCriterionMark(SPEC, 1, "banana").error, /verified\|unverified\|orchestration/);
  assert.equal(setCriterionMark(SPEC, 1, "[unverified]").error, undefined);
  assert.match(appendCriterion(SPEC, "[banana] two — verified by `b.js`.").error, /verified\|unverified\|orchestration/);
  assert.equal(appendCriterion(SPEC, "[orchestration] a run happened — verified by `verify:test`.").error, undefined);
});

test("spec set leaves the spec untouched on a value outside the domain", () => {
  const { dir, specPath } = project();
  const before = readFileSync(specPath, "utf8");
  for (const args of [
    ["--status", "bogus"],
    ["--implementation", "banana"],
    ["--criterion", "1:banana"],
  ]) {
    const res = run(dir, ["spec", "set", "carteira", ...args]);
    assert.notEqual(res.status, 0, args.join(" "));
    assert.match(res.stderr, /must be one of/, args.join(" "));
    assert.equal(readFileSync(specPath, "utf8"), before, `${args.join(" ")} left the spec untouched`);
  }
  const ok = run(dir, ["spec", "set", "carteira", "--implementation", "partial — one criterion still open"]);
  assert.equal(ok.status, 0, ok.stderr);
});

test("validate reports a hand-written value outside the domain as an error", () => {
  const { dir, specPath } = project();
  let text = readFileSync(specPath, "utf8");
  text = text.replace("**Status:** active", "**Status:** bogus")
    .replace("1. [unverified]", "1. [banana]");
  writeFileSync(specPath, text);
  assert.equal(run(dir, ["index", "rebuild"]).status, 0);
  const res = run(dir, ["validate"]);
  assert.equal(res.status, 1);
  const out = res.stdout + res.stderr;
  assert.match(out, /error: .*Status must be one of draft\|active\|deprecated \(got "bogus"\)/);
  assert.match(out, /error: .*acceptance criterion #1: a criterion mark must be one of/);
});
