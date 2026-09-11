// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// THERE IS ONE AUTHORED TEMPLATE TREE, AND A PACKAGING STEP.
//
// `packages/doctrina-cli/templates/` looks like a second copy kept by hand.
// It is not: it is gitignored, absent from a fresh checkout, and written by
// the `prepack` hook from `.doctrina/templates/` immediately before the
// tarball is built. Change 0149 read a stale generated copy in a working
// container as evidence that a fix had missed the package, and "fixed" a
// divergence that could not exist — leaving behind a test that read a
// directory CI does not have.
//
// What is worth holding is the packaging CHAIN, because every link in it is
// silent when it breaks: drop the hook, or drop `templates` from `files`,
// and the published package installs with no templates at all — `doctrina
// init` then fails for every adopter while every gate here stays green.

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(here, "..");
const repoRoot = path.resolve(pkgRoot, "..", "..");

const pkg = JSON.parse(readFileSync(path.join(pkgRoot, "package.json"), "utf8"));

test("the canonical template tree is the one in version control", () => {
  assert.ok(existsSync(path.join(repoRoot, ".doctrina", "templates", "change", "proposal.md.template")),
    "the authored templates live at .doctrina/templates/ — edit them there");
  const ignore = readFileSync(path.join(repoRoot, ".gitignore"), "utf8");
  assert.match(ignore, /^packages\/doctrina-cli\/templates\/$/m,
    "the packaged tree is generated, so it stays out of version control; if it "
    + "ever becomes authored, this test and the prepack hook both have to change");
});

test("the tarball is wired to carry the templates it is built from", () => {
  assert.equal(pkg.scripts?.prepack, "node scripts/copy-templates.js",
    "without the hook the packaged tree is never written");
  assert.ok(pkg.files?.includes("templates"),
    "without the files entry the packaged tree is written and then left out of the tarball");
  assert.ok(pkg.files?.includes("src"), "precondition: the package ships its source");
});

test("the copier reads the canonical tree and writes the packaged one", () => {
  const copier = readFileSync(path.join(pkgRoot, "scripts", "copy-templates.js"), "utf8");
  assert.match(copier, /path\.join\(repoRoot, "\.doctrina", "templates"\)/,
    "the source of the copy is the authored tree");
  assert.match(copier, /path\.join\(pkgRoot, "templates"\)/,
    "the target of the copy is what `files` ships");
  // A copy that adds to a stale target is how a deleted template survives a
  // release. The hook clears first; keep it that way.
  assert.match(copier, /rmSync\(target/,
    "the target is cleared before the copy, so a removed template does not linger");
});
