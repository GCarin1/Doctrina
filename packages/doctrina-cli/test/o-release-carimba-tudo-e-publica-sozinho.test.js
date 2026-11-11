// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { disagreements, stamps } from "../../../scripts/release.mjs";

// THE RELEASE STAMPS EVERY PLACE THAT QUOTES THE VERSION, AND PUBLISHES BY
// ITSELF (change 0245).
//
// Two releases in three days failed on a list kept in a person's head. The
// tag v0.20.0 went on a merge made after 0.20.0 was already on npm; the tag
// v0.21.0 went on a commit whose examples were still stamped 0.20.0. And
// SECURITY.md had said "0.16.x is the supported version" for five releases.

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..", "..");
const version = JSON.parse(readFileSync(path.join(repo, "packages", "doctrina-cli", "package.json"), "utf8")).version;

test("every place that quotes the version agrees with package.json", () => {
  assert.deepEqual(disagreements(version), [], "run `node scripts/release.mjs " + version + "`");
});

test("the list of stamps covers what drifted before", () => {
  const files = stamps(version).map((s) => s.file);
  for (const file of ["package-lock.json", "README.md", "README.pt.md", "packages/doctrina-cli/README.md", "SECURITY.md", "AGENTS.md", ".doctrina/index.json"]) {
    assert.ok(files.includes(file), file);
  }
  assert.ok(files.filter((f) => f.startsWith("examples/")).length >= 2, "each example carries its own index");
  const behind = disagreements("99.0.0");
  assert.ok(behind.length >= files.length, "a version nothing quotes yet is named by every stamp");
  assert.ok(behind.some((l) => /CHANGELOG\.md: no `## \[99\.0\.0\]/.test(l)));
  assert.ok(behind.some((l) => /SECURITY\.md: the supported minor is \d+\.\d+, expected 99\.0/.test(l)));
});

test("the workflow publishes a version that reached main, and tags it itself", () => {
  const release = readFileSync(path.join(repo, ".github", "workflows", "release.yml"), "utf8");
  assert.match(release, /branches: \[main\]\n\s+paths:\n\s+- packages\/doctrina-cli\/package\.json/, "a version bump merged into main is the trigger");
  assert.match(release, /scripts\/release\.mjs --check/, "the stamps are asked first, in seconds");
  assert.match(release, /contents: write/, "the job pushes the tag");
  assert.match(release, /git tag "\$\{tag\}" "\$\{GITHUB_SHA\}"/, "the tag names the commit that was published");
  const publish = release.indexOf("npm publish");
  assert.ok(publish > 0 && publish < release.indexOf("git tag"), "tagged after the publish, never before");
  const gated = release.split("\n      - name: ").slice(4);
  for (const step of gated) assert.match(step, /if: steps\.plan\.outputs\.publish == 'true'/, step.split("\n")[0]);
  assert.doesNotMatch(release, /node-version: "20/, "not from a Node that reached end of life");
});
