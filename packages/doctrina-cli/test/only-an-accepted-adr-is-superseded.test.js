import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Change 0109 — só uma ADR aceita é superada.
//
// Measured in a clean project with 0001 and 0002 still proposed:
//   decision supersede 0001 0002 → created 0003-0002.md; 0001 → superseded by 0003
// Two things wrong in one call. A proposed ADR was never a rule, so
// superseding it builds a chain of decisions that never held; and a title
// that is only digits is the argument order swapped, not a decision.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-supersede-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira de investimentos"]).status, 0);
  assert.equal(run(dir, ["decision", "new", "Usar reportlab para PDF"]).status, 0);
  return dir;
}

function adrFiles(dir) {
  return readdirSync(path.join(dir, ".doctrina", "decisions")).filter((f) => f.endsWith(".md")).sort();
}

function writeBody(dir) {
  const file = path.join(dir, ".doctrina", "decisions", adrFiles(dir)[0]);
  let text = readFileSync(file, "utf8");
  text = text.replace(/## Context[\s\S]*?## Decision/, "## Context\n\nWe need a PDF engine.\n\n## Decision")
    .replace(/## Decision[\s\S]*?## Consequences/, "## Decision\n\nUse reportlab.\n\n## Consequences")
    .replace(/## Consequences[\s\S]*$/, "## Consequences\n\nPure Python dependency.\n");
  assert.notEqual(text, readFileSync(file, "utf8"), "the body was written");
  writeFileSync(file, text);
}

test("a proposed ADR cannot be superseded, and the state is named", () => {
  const dir = project();
  const before = adrFiles(dir);
  const res = run(dir, ["decision", "supersede", "0001", "Trocar reportlab por weasyprint"]);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /ADR 0001 is "proposed", not "accepted"/);
  assert.match(res.stderr, /rejected|delete/);
  assert.deepEqual(adrFiles(dir), before, "no successor was created");
  assert.match(readFileSync(path.join(dir, ".doctrina", "decisions", before[0]), "utf8"), /\*\*Status:\*\* proposed/);
});

test("an accepted ADR is superseded as before", () => {
  const dir = project();
  writeBody(dir);
  assert.equal(run(dir, ["decision", "accept", "0001"]).status, 0);
  const res = run(dir, ["decision", "supersede", "0001", "Trocar reportlab por weasyprint"]);
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(adrFiles(dir), ["0001-usar-reportlab-para-pdf.md", "0002-trocar-reportlab-por-weasyprint.md"]);
  assert.match(readFileSync(path.join(dir, ".doctrina", "decisions", "0001-usar-reportlab-para-pdf.md"), "utf8"), /\*\*Status:\*\* superseded by 0002/);
});

test("a title that is only digits is the argument order swapped, and is refused", () => {
  const dir = project();
  writeBody(dir);
  assert.equal(run(dir, ["decision", "accept", "0001"]).status, 0);
  const res = run(dir, ["decision", "supersede", "0001", "0002"]);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /supersede <number> "<title>"/);
  assert.deepEqual(adrFiles(dir), ["0001-usar-reportlab-para-pdf.md"]);
});
