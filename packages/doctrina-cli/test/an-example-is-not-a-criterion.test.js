import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { parseAcceptanceCriteria } from "../src/lib/criteria.js";

// Change 0097 — an example inside a fence is a picture of a criterion.
//
// A spec that documents the criterion format writes a sample one inside a
// code fence. The parser walked lines and never tracked fences, so the
// sample counted: a `[verified]` example citing `pkg/x.js` inflated the
// coverage denominator and `show <cap>-C2` answered with the example
// instead of the criterion (third audit, finding 4).
//
// The sharper half was underneath. `lib/criteria.js` opens by claiming to
// be the one parser every surface reads criteria through — and
// `coverage-model.js` carried a second implementation, so `coverage` and
// `show`/`why`/`validate` were free to disagree about what a criterion is.
// Fixing the fence in one of them proved it: coverage still counted three
// while show counted one.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

const SPEC = [
  "# Spec — relatorio", "",
  "**Capability:** relatorio",
  "**Status:** active",
  "**Implementation:** planned — deferred on purpose",
  "**Realizes:** n/a — fixture",
  "**Last updated:** 2026-09-09",
  "**Version:** 0.1.0", "",
  "## Purpose", "", "A fixture that documents its own format.", "",
  "## Acceptance criteria", "",
  "1. [unverified] The real criterion — verified by `nowhere/missing.md`.", "",
  "The format of a criterion is:", "",
  "```",
  "2. [verified] An example inside a fence — verified by `pkg/x.js`.",
  "3. [verified] Another one — verified by `pkg/y.js`.",
  "```", "",
].join("\n");

function projectWithFencedSpec() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-fence-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  mkdirSync(path.join(dir, ".doctrina", "specs", "relatorio"), { recursive: true });
  writeFileSync(path.join(dir, ".doctrina", "specs", "relatorio", "spec.md"), SPEC);
  assert.equal(run(dir, ["index", "rebuild"]).status, 0);
  return dir;
}

test("a fenced example is not parsed as a criterion", () => {
  const rows = parseAcceptanceCriteria(SPEC);
  assert.equal(rows.length, 1, `expected one criterion, got ${rows.map((r) => r.n).join(", ")}`);
  assert.equal(rows[0].n, 1);
  assert.deepEqual(rows[0].proofPaths, ["nowhere/missing.md"],
    "an example's citation must not become the criterion's proof");
});

test("a fence closes only on a matching marker, and ~~~ counts too", () => {
  const withTildes = SPEC.replace(/```/g, "~~~");
  assert.equal(parseAcceptanceCriteria(withTildes).length, 1);

  // A longer opener is closed only by one at least as long — the CommonMark
  // rule. An inner ``` must not end an outer ````.
  const nested = [
    "## Acceptance criteria", "",
    "1. [unverified] Real — verified by `a/b.md`.", "",
    "````",
    "```",
    "2. [verified] Still inside — verified by `pkg/x.js`.",
    "```",
    "````", "",
  ].join("\n");
  assert.equal(parseAcceptanceCriteria(nested).length, 1);
});

test("coverage and show agree, because they read through one parser", () => {
  // The duplication is the finding: fixing the fence in `criteria.js` left
  // coverage counting three, because coverage had its own parser.
  const dir = projectWithFencedSpec();
  try {
    const coverage = run(dir, ["coverage"]);
    assert.match(coverage.stdout, /relatorio\s+0\/1 criteria/,
      `coverage counted the fenced examples:\n${coverage.stdout}`);

    assert.match(run(dir, ["show", "relatorio-C1"]).stdout, /The real criterion/);
    const c2 = run(dir, ["show", "relatorio-C2"]);
    assert.notEqual(c2.status, 0, "there is no criterion 2 — only an example of one");
    assert.match(c2.stdout + c2.stderr, /no acceptance criterion #2/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a heading inside a fence does not open the criteria section", () => {
  // Fence state is tracked over the whole file for this reason: a fenced
  // block showing "## Acceptance criteria" is documentation, not a section.
  const doc = [
    "# Spec — x", "", "## Purpose", "",
    "```",
    "## Acceptance criteria", "",
    "1. [verified] Not real — verified by `pkg/x.js`.",
    "```", "",
    "## Acceptance criteria", "",
    "1. [unverified] The only one — verified by `a/b.md`.", "",
  ].join("\n");
  const rows = parseAcceptanceCriteria(doc);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].proofPaths, ["a/b.md"]);
});
