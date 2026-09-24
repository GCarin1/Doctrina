// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// A RELEASE IS THE LAST MOMENT A DEFECT IS CHEAP.
//
// The publish job used to run typecheck, the suite and `validate` — a strict
// subset of what every pull request already survives, which made the thinnest
// gate in the repository the one standing between a defect and the registry.
// Nothing said it could not shrink further, because nothing said what it had
// to run at all.
//
// These tests are that statement. They read the workflows as text rather than
// parsing YAML: the claim is "this command appears in this job", and a
// substring is a truthful and dependency-free way to ask it.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");

const workflow = (name) =>
  readFileSync(path.join(repoRoot, ".github", "workflows", name), "utf8");

test("the release job runs the declared build gate", () => {
  const release = workflow("release.yml");
  assert.match(release, /src\/index\.js verify/,
    "a release must run `doctrina verify` — the eight checks verify.json declares");
});

test("the release job runs the packed-install harness", () => {
  const release = workflow("release.yml");
  assert.match(release, /scripts\/e2e-packed\.mjs/,
    "a release must exercise the tarball it is about to publish: three defects "
    + "were invisible from a source checkout and obvious from a packed install");
});

test("the release job validates the shipped examples strictly", () => {
  const release = workflow("release.yml");
  assert.match(release, /validate --strict/,
    "a warning in a published example is a defect (change 0126)");
});

test("publishing carries provenance, which is what id-token: write buys", () => {
  const release = workflow("release.yml");
  assert.match(release, /npm publish[^\n]*--provenance/,
    "the job requests id-token: write; without --provenance that permission is "
    + "granted and spent on nothing");
  assert.match(release, /id-token: write/,
    "--provenance cannot be signed without the permission that mints the token");
});

// The two workflows are allowed to differ in SHAPE — CI runs a matrix across
// three operating systems and two Node versions, a release runs once. What
// they may not differ in is which gates run at all.
test("every gate the PR job runs has a counterpart in the release job", () => {
  const ci = workflow("ci.yml");
  const release = workflow("release.yml");

  // Named by the command that runs them, so a renamed step never fakes a pass.
  const gates = [
    ["the packed-install harness", /scripts\/e2e-packed\.mjs/],
    ["the examples check", /validate --strict/],
  ];

  for (const [label, pattern] of gates) {
    assert.match(ci, pattern, `precondition: ci.yml is expected to run ${label}`);
    assert.match(release, pattern,
      `${label} runs on every pull request but not on a release — the release `
      + "gate must not be weaker than the gate the change already passed");
  }

  // CI spells the eight checks out as separate steps so a matrix leg fails on
  // the precise one; the release runs them through `verify`, which is the same
  // list from the same declaration. Either spelling satisfies the requirement.
  assert.match(release, /src\/index\.js verify/);
});
