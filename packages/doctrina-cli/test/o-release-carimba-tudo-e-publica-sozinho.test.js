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
  // Seventh audit (change 0250): `workflow_dispatch` runs on any branch and a
  // tag can sit on any commit; either would have published unmerged code.
  assert.match(release, /"\$\{GITHUB_REF_NAME\}" != "main"/, "a manual run from another branch is refused");
  assert.match(release, /git merge-base --is-ancestor "\$\{GITHUB_SHA\}" origin\/main/, "the commit must be on main");
  assert.match(release, /fetch-depth: 0/, "which needs the history");
  assert.ok(release.indexOf("is-ancestor") < release.indexOf("npm view"), "asked before anything else is decided");
});

// THE TAG IS THE JOB'S OUTPUT, AND NPM MAY HOLD A VERSION (change 0262).
// 0.22.0: the run on main published and tagged; the run the tag started asked
// npm whether the version was out seconds later, heard "not yet" — npm had
// staged it, waiting for a maintainer's 2FA approval — and published again:
// E409, a red run beside a release that had gone out.
test("a tag does not start a release, and a version npm holds is a warning that says how to approve it", () => {
  const release = readFileSync(path.join(repo, ".github", "workflows", "release.yml"), "utf8");
  const on = release.slice(release.indexOf("\non:"), release.indexOf("\npermissions:"));
  assert.doesNotMatch(on, /tags:/, "the job writes the tag; it is never what starts it");
  assert.match(release, /if \[ "\$\{GITHUB_REF_TYPE\}" = "tag" \]; then[\s\S]{0,400}publish=false/, "a manual run on a tag publishes nothing");
  assert.match(release, /grep -q "previously staged version"[\s\S]{0,400}exit 0/, "publishing a version npm already holds staged is not a failure");
  assert.match(release, /- name: Is the published version public\?[\s\S]*npm view "doctrina-cli@\$\{version\}" version[\s\S]*::warning::[^\n]*npm stage approve/, "a version accepted and not public says how to approve it");
  assert.ok(release.indexOf("Is the published version public?") < release.indexOf("git tag"), "asked before the tag");
  assert.match(release, /npm can publish through trusted publishing[\s\S]*11\.5\.1/, "trusted publishing needs npm 11.5.1 or later");
  assert.match(release, /id-token: write/, "and the OIDC token");
});
