import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Change 0112 — o intake convertido não volta.
//
// With two active specs and the intake already `converted`, `intake --force
// --text "..."` rewrote the file to `pending` and printed the bootstrap
// playbook as if the tree were empty; `next` then asked for a conversion.
// AGENTS.md says the specs are the only source of truth after conversion
// and the intake is never edited to change requirements — `--force` was
// the CLI-sanctioned way to do exactly that.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-intake-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira de investimentos"]).status, 0);
  return { dir, intakePath: path.join(dir, ".doctrina", "intake.md") };
}

test("a pending intake may still be replaced with --force", () => {
  const { dir, intakePath } = project();
  const res = run(dir, ["intake", "--force", "--text", "Uma carteira de investimentos com relatório mensal em PDF e alertas."]);
  assert.equal(res.status, 0, res.stderr);
  assert.match(readFileSync(intakePath, "utf8"), /relatório mensal em PDF/);
});

test("a converted intake is not overwritten, even with --force, and the doors are named", () => {
  const { dir, intakePath } = project();
  const original = readFileSync(intakePath, "utf8");
  const converted = original.replace("- **Status:** pending", "- **Status:** converted");
  assert.notEqual(converted, original, "the status was flipped");
  writeFileSync(intakePath, converted);
  const res = run(dir, ["intake", "--force", "--text", "Descrição nova e diferente"]);
  assert.equal(res.status, 3, res.stdout + res.stderr);
  assert.match(res.stderr, /already converted/);
  assert.match(res.stderr, /doctrina intent add/);
  assert.match(res.stderr, /doctrina work/);
  assert.equal(readFileSync(intakePath, "utf8"), converted, "the file was left untouched");
  assert.doesNotMatch(res.stdout, /Bootstrap playbook/);
});
