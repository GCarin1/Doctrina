// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { documentedSurfaceSignals, looksLikeEnv } from "../src/lib/docs-impact.js";

// THE DOCS GATE TELLS AN ENVIRONMENT VARIABLE FROM A CONSTANT (change 0239).
//
// Fixing a login in a project whose errors are MAIUSCULAS_SNAKE codes (an
// accepted ADR there), the close stopped at the docs gate: "this change
// alters a documented surface — environment: CREDENCIAIS_INVALIDAS,
// NOME_INDISPONIVEL". Every UPPER_SNAKE name in a code span was taken for an
// environment variable, so citing an error code or a constant asked for
// documentation of an environment the change never touched.

function project(envExample = "") {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-docsgate-env-"));
  mkdirSync(path.join(root, ".doctrina"), { recursive: true });
  if (envExample) writeFileSync(path.join(root, ".env.example"), envExample);
  return root;
}

function change(root, why) {
  const dir = path.join(root, "changes", Math.random().toString(36).slice(2));
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "proposal.md"), `# Change 0004-x — x\n\n- **Status:** proposed\n\n## Why\n\n${why}\n`);
  return dir;
}

const environment = (/** @type {string[]} */ signals) => signals.find((s) => s.startsWith("environment:")) ?? null;

test("an error code or a constant cited by a change is not an environment variable", () => {
  const root = project();
  try {
    const signals = documentedSurfaceSignals(change(root,
      "An unknown user answers 401 `CREDENCIAIS_INVALIDAS`; a missing name, 500 `NOME_INDISPONIVEL`; raise `MAX_FALHAS` to 5."), root);
    assert.equal(environment(signals), null, JSON.stringify(signals));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a variable is still recognised by how it is read, by what the line says, by its suffix, or by the env example", () => {
  const root = project("PAYMENTS_MODEL=\nexport ANALYTICS_SAMPLE=0.1\n");
  try {
    const cases = {
      "read the way code reads one": "Read `process.env.FEATURE_CHECKOUT` before the call.",
      "assigned": "Run with `FEATURE_CHECKOUT=1`.",
      "named on a line about the environment": "A new environment variable `FEATURE_CHECKOUT` turns it on.",
      "named in Portuguese": "A nova variável de ambiente `FEATURE_CHECKOUT` liga o fluxo.",
      "a configuration suffix": "Introduce `LEDGERLY_MAIL_URL` for the outbound queue.",
      "declared in .env.example": "Default `ANALYTICS_SAMPLE` to a tenth.",
    };
    for (const [why, text] of Object.entries(cases)) {
      assert.ok(environment(documentedSurfaceSignals(change(root, text), root)), `${why}: ${text}`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  for (const [name, text] of [["CONTA_BLOQUEADA", "answers `CONTA_BLOQUEADA`"], ["ERRO_X", "the `ERRO_X` code"]]) {
    assert.equal(looksLikeEnv(name, text), false, name);
  }
});
