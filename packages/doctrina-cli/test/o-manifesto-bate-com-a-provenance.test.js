// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// THE MANIFEST NPM PUBLISHES IS THE ONE IN THE REPOSITORY.
//
// The 0.17.0 release job passed every gate and was refused at the last
// step (change 0198): with `--provenance`, npm compares the manifest's
// `repository.url` to the repository the GitHub attestation names —
// `https://github.com/GCarin1/Doctrina` — and the manifest said
// `gcarin1/doctrina`. Case matters to that comparison. The same run warned
// that npm had "auto-corrected" the manifest (`bin` path, `git+` URL): the
// package it publishes should be the one under review, not a rewrite of it.

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..", "..");
const json = (rel) => JSON.parse(readFileSync(path.join(repo, rel), "utf8"));

// The slug as GitHub spells it — the clone URL the READMEs and CONTRIBUTING
// hand every contributor, which is the name the provenance carries.
function canonicalSlug() {
  const m = /git clone https:\/\/github\.com\/([^/\s]+\/[^/\s.]+)(?:\.git)?/.exec(read("CONTRIBUTING.md"));
  assert.ok(m, "CONTRIBUTING.md names the clone URL");
  return m[1];
}
const read = (rel) => readFileSync(path.join(repo, rel), "utf8");

test("repository.url names the repository exactly as the provenance will", () => {
  const slug = canonicalSlug();
  for (const manifest of ["package.json", "packages/doctrina-cli/package.json"]) {
    assert.equal(json(manifest).repository.url, `git+https://github.com/${slug}.git`, manifest);
  }
});

test("npm has nothing to auto-correct in the published manifest", () => {
  const pkg = json("packages/doctrina-cli/package.json");
  for (const [name, target] of Object.entries(pkg.bin ?? {})) {
    assert.ok(!String(target).startsWith("./"), `bin ${name} is "${target}"; npm rewrites a leading ./`);
  }
  assert.match(pkg.repository.url, /^git\+https:\/\/.+\.git$/, "npm normalises the URL to git+https://….git");
});
