import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Change 0113 — uma spec fora do caminho é apontada.
//
// A change directory without `proposal.md` is a validate error — AGENTS.md
// says "that exact filename". A spec written at `.doctrina/specs/legacy.md`,
// a capability directory without `spec.md`, and a second `spec-old.md`
// inside a capability directory were silence: not indexed, not in any
// pack, not counted, not traced, and nothing said so.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

const SPEC = "# Spec — legacy\n\n**Capability:** legacy\n**Status:** active\n**Version:** 0.1.0\n\n## Purpose\n\nx\n";

test("a loose spec, an empty capability directory and a second spec file are each named with the canonical path", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-offpath-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira de investimentos"]).status, 0);
  assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
  const specs = path.join(dir, ".doctrina", "specs");
  writeFileSync(path.join(specs, "legacy.md"), SPEC);
  mkdirSync(path.join(specs, "orfao"));
  writeFileSync(path.join(specs, "orfao", "notes.md"), "# notes\n");
  writeFileSync(path.join(specs, "carteira", "spec-old.md"), SPEC.replace("legacy", "carteira"));
  writeFileSync(path.join(specs, "carteira", "notes.md"), "# notes about carteira\n");

  const res = run(dir, ["validate"]);
  assert.equal(res.status, 0, "warnings, not errors");
  assert.match(res.stdout, /warn: .*specs\/legacy\.md is not where a spec is read from — a spec lives at \.doctrina\/specs\/<capability>\/spec\.md/);
  assert.match(res.stdout, /warn: .*specs\/orfao\/ has no spec\.md — a capability directory is read only through \.doctrina\/specs\/orfao\/spec\.md/);
  assert.match(res.stdout, /warn: .*specs\/carteira\/spec-old\.md opens like a spec but only spec\.md is read/);
  assert.doesNotMatch(res.stdout, /carteira\/notes\.md/, "a notes file beside spec.md is not a spec");
  assert.doesNotMatch(run(dir, ["spec", "list"]).stdout, /legacy|orfao/);
});
