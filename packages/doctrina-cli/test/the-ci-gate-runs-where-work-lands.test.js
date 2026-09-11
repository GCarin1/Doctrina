// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// A GATE THAT DOES NOT RUN IS NOT A GATE.
//
// `ci.yml` listed only `main`, but `main` is not where work lands: feature
// branches merge into `develop`, and `develop` reaches `main` through a single
// release pull request. So a pull request into `develop` ran no checks at all,
// and the first time anything was verified was after integration — the one
// moment a gate can no longer help. PR #15 merged exactly that way.
//
// The trigger list is one line of YAML that nobody reads twice, which is
// precisely why it earns an assertion.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const ci = readFileSync(path.join(repoRoot, ".github", "workflows", "ci.yml"), "utf8");

// The `on:` block only — a branch name appearing in a comment or a step
// elsewhere in the file must not be mistaken for a trigger.
function triggerBlock() {
  const start = ci.search(/^on:/m);
  assert.ok(start >= 0, "ci.yml must declare an `on:` block");
  const rest = ci.slice(start + 3);
  const end = rest.search(/^[a-z]/m);
  return end >= 0 ? rest.slice(0, end) : rest;
}

test("CI runs on both branches work actually lands on", () => {
  const on = triggerBlock();
  for (const branch of ["main", "develop"]) {
    assert.match(on, new RegExp(`\\b${branch}\\b`),
      `ci.yml must trigger on ${branch}: a branch that receives merges without `
      + "running the gate is a branch where the gate does not exist");
  }
});

test("both a push and a pull request are gated", () => {
  const on = triggerBlock();
  assert.match(on, /push:/, "a direct push must still be checked");
  assert.match(on, /pull_request:/,
    "checking only pushes means the check arrives after the merge decision");
});
