// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { documentedSurfaceSignals } from "../src/lib/docs-impact.js";

// THE TEMPLATE THAT SHIPS IS THE ONE THAT MATTERS.
//
// Change 0144 put the `Documented surface: n/a — <why>` guidance into the
// proposal template "where the author is" — and put it into ONE of the two
// trees. This repository resolves templates from its own `.doctrina/`
// override (ADR 0019), so every close here saw the guidance and every test
// read it there. The package published to adopters carried the template
// without it: the escape hatch for the gate that refuses them existed only
// in the repository that wrote it.
//
// The override exists here to DOGFOOD the shipped tree, not to diverge from
// it. So the two are compared whole, and the shipped file is held to the
// same behaviour as the one the other tests read.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const SHIPPED = path.join(repoRoot, "packages", "doctrina-cli", "templates");
const OVERRIDE = path.join(repoRoot, ".doctrina", "templates");

function filesUnder(root, prefix = "") {
  const out = [];
  for (const entry of readdirSync(root, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...filesUnder(path.join(root, entry.name), rel));
    else out.push(rel);
  }
  return out;
}

test("this repository's template override is a copy of the shipped tree", () => {
  assert.deepEqual(filesUnder(OVERRIDE), filesUnder(SHIPPED),
    "the two template trees must hold the same files");
  const differing = filesUnder(SHIPPED).filter((rel) =>
    readFileSync(path.join(SHIPPED, rel), "utf8") !== readFileSync(path.join(OVERRIDE, rel), "utf8"));
  assert.deepEqual(differing, [],
    "a template fix must land on the SHIPPED copy too — this repository reads "
    + "its override, so a one-sided edit is invisible here and absent for everyone else");
});

// The guidance is only guidance if the gate it explains still fires around
// it. Same proof the override already carries, run against the shipped file.
test("a change scaffolded from the SHIPPED template is still gated", () => {
  const template = readFileSync(path.join(SHIPPED, "change", "proposal.md.template"), "utf8");
  assert.match(template, /Documented surface:/,
    "the shipped template must name the declaration the docs gate asks for");

  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-shipped-tpl-"));
  try {
    const dir = path.join(tmp, ".doctrina", "changes", "0001-a-change");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "proposal.md"), template
      .replace("{{CHANGE_ID}}", "0001-a-change")
      .replace("{{CHANGE_TITLE}}", "a change")
      .replace("{{DATE}}", "2026-09-11")
      .replace("- **Lane:**", "- **Lane:** product")
      .replace("<!-- The user-visible or technical reason this change exists. -->",
        "`doctrina validate` gains a `--strict` flag."));
    assert.ok(documentedSurfaceSignals(dir, tmp).length > 0,
      "the shipped template's own example must not disarm the gate");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// A template tree nobody declares is a tree nobody reviews — which is how
// one of the two copies went a change without being edited.
test("the shipped template tree is declared by the capability that owns it", () => {
  const spec = readFileSync(path.join(repoRoot, ".doctrina", "specs", "templates", "spec.md"), "utf8");
  const source = /^\*\*Source:\*\*.*$/m.exec(spec)?.[0] ?? "";
  assert.match(source, /packages\/doctrina-cli\/templates/,
    "the tree that ships to adopters must be named in the spec's Source header (ADR 0027)");
  assert.ok(statSync(SHIPPED).isDirectory());
});
