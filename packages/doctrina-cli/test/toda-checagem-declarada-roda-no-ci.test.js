// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// A CHECK DECLARED AND NOT RUN IS A CHECK NOBODY RUNS.
//
// `.doctrina/verify.json` declares eight checks. The release job executed
// all eight, through `doctrina verify`. Every pull request executed a
// hand-copied subset — and the copy had lost `docs-shape`, so a docs defect
// was first measured on a release, after it had already been integrated.
// The file's own comment claimed the two sets matched; nothing asked.
//
// The two spellings are both legitimate: the composite action runs the gates
// any project has, and CI spells the rest out so a matrix leg fails on the
// precise one. What is not legitimate is a declared check appearing in
// neither.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const read = (...p) => readFileSync(path.join(repoRoot, ...p), "utf8");

const verify = JSON.parse(read(".doctrina", "verify.json"));
const ci = read(".github", "workflows", "ci.yml");
const action = read("action.yml");

// The action invokes the CLI through a prefix input, so a step there reads
// `${{ steps.cli.outputs.prefix }} coverage --strict` where verify.json says
// `node packages/doctrina-cli/src/index.js coverage --strict`. Compare the
// part after the invocation.
const CLI_PREFIX = "node packages/doctrina-cli/src/index.js ";
const tailOf = (run) => (run.startsWith(CLI_PREFIX) ? run.slice(CLI_PREFIX.length) : run);

test("every check declared in verify.json runs on a pull request", () => {
  assert.ok(verify.checks.length >= 8, "precondition: the declaration is not empty");
  const absent = verify.checks
    .filter((c) => !ci.includes(c.run) && !action.includes(tailOf(c.run)))
    .map((c) => `${c.name} (${c.run})`);
  assert.deepEqual(absent, [],
    "a declared check missing from CI only ever fails after integration");
});

test("the workflow that runs on pull requests is the one measured", () => {
  // Reading the right file is half the claim: if `on:` ever stops covering
  // pull requests, the check above measures a workflow nobody triggers.
  const on = ci.slice(ci.indexOf("on:"), ci.indexOf("permissions:"));
  assert.match(on, /pull_request:/);
  for (const branch of ["main", "develop"]) {
    assert.ok(on.includes(branch), `pull requests into ${branch} must run it`);
  }
});

// The guard has to be able to fail, or it is decoration.
test("a check nobody runs is reported", () => {
  const invented = { name: "invented", run: "node scripts/no-such-check.js" };
  assert.ok(!ci.includes(invented.run) && !action.includes(tailOf(invented.run)),
    "an undeclared command must read as absent from both surfaces");
});
