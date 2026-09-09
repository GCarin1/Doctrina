import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { classify } from "../src/lib/triage-model.js";

// Change 0107 — o triage fala português.
//
// The lane lexicon was English-only. Measured in a clean project:
//
//   work "the build is broken in CI, DATABASE_URL never reaches the process"
//        → hold: RUNTIME, exit 3
//   work "o build está quebrado no CI, a variável DATABASE_URL nunca chega ao processo"
//        → change created, exit 0
//
// The guard the 0.15.1 release added did not hold the same request in the
// language this project's prompts arrive in. The prompt is now folded and
// every signal list carries both vocabularies. The second half: `clarify`
// with per-file detection scanned a bilingual spec with one lexicon and
// found nothing where `--lang pt` found two — both lexicons now run.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

const PAIRS = [
  ["runtime", "the build is broken in CI, DATABASE_URL never reaches the process",
    "o build está quebrado no CI, a variável DATABASE_URL nunca chega ao processo"],
  ["runtime", "the smoke job passes but 0 tests ran",
    "o job de smoke passa mas 0 testes rodaram"],
  ["chore", "update the README and fix a typo",
    "atualizar o README e corrigir um erro de digitação"],
  ["product", "add CSV export of the consolidated portfolio so that users can share it",
    "adicionar exportação CSV da carteira consolidada para que o usuário possa compartilhar"],
];

test("each lane is read the same in Portuguese and in English", () => {
  for (const [lane, en, pt] of PAIRS) {
    assert.equal(classify(en).lane, lane, en);
    assert.equal(classify(pt).lane, lane, pt);
  }
});

test("accents do not decide the lane", () => {
  const plain = classify("variavel de ambiente nao chega ao processo, o job esta verde mas rodou nada");
  const accented = classify("variável de ambiente não chega ao processo, o job está verde mas rodou nada");
  assert.equal(plain.lane, "runtime");
  assert.deepEqual(accented.scores, plain.scores);
});

test("authoring in Portuguese is still authoring", () => {
  // The English twin of this prompt is the existing regression test.
  const v = classify("declarar a fiação do workflow de release num contrato e adicionar um guard expect ao check de teste");
  assert.equal(v.lane, "product", `misread as ${v.lane}`);
});

test("work holds the Portuguese runtime prompt with the precondition class", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-pt-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira de investimentos"]).status, 0);
  const res = run(dir, ["work", "o build está quebrado no CI, a variável DATABASE_URL nunca chega ao processo", "--quiet"]);
  assert.equal(res.status, 3, res.stdout + res.stderr);
  assert.match(res.stdout + res.stderr, /RUNTIME/);
});

test("clarify with per-file detection reports a smell in either language", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-clarify-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira de investimentos"]).status, 0);
  assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
  const specPath = path.join(dir, ".doctrina", "specs", "carteira", "spec.md");
  const text = readFileSync(specPath, "utf8").replace(
    "### Ubiquitous",
    "### Ubiquitous\n\n- The system shall export the ledger in several formats.\n- O sistema deve gerar o relatório de forma adequada.\n",
  );
  writeFileSync(specPath, text);
  const res = run(dir, ["clarify", "--all"]);
  assert.equal(res.status, 1);
  assert.match(res.stdout, /vague "several"/);
  assert.match(res.stdout, /vague "adequada"/);
  // A forced language still scans with that lexicon alone.
  const en = run(dir, ["clarify", "--all", "--lang", "en"]);
  assert.match(en.stdout, /vague "several"/);
  assert.doesNotMatch(en.stdout, /adequada/);
});
