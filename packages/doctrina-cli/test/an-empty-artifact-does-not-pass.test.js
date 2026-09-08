import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { artifactFiles } from "../src/lib/validation-model.js";

// Change 0087 — an empty artifact does not pass the structural gate.
//
// Check 4 asks whether an indexed file EXISTS, and a zero-byte file exists.
// Measured before this: a spec, a proposal, a contract, a skill and
// `product.md` each emptied to zero bytes reported `ok, 0 errors` — only an
// ADR was caught. The header-vs-index comparison runs on the headers it
// finds, so a file with none is compared against nothing and agrees.
//
// Third appearance of one pattern: absence is not approval. Change 0057
// fixed it in `coverage`, 0083 in `trace`, and it was sitting in the
// structural gate the whole time.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

// A project holding one of every artifact kind.
function fullProject() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-empty-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira"]).status, 0);
  for (const args of [
    ["spec", "new", "carteira"],
    ["decision", "new", "usar decimal para dinheiro"],
    ["change", "new", "0001-x", "um titulo"],
    ["contract", "new", "system"],
    ["skill", "new", "importar-nota"],
  ]) assert.equal(run(dir, args).status, 0, args.join(" "));
  assert.equal(run(dir, ["index", "rebuild"]).status, 0);
  assert.equal(run(dir, ["validate"]).status, 0, "the fixture must start clean");
  return dir;
}

const KINDS = [
  ".doctrina/product.md",
  ".doctrina/specs/carteira/spec.md",
  ".doctrina/decisions/0001-usar-decimal-para-dinheiro.md",
  ".doctrina/changes/0001-x/proposal.md",
  ".doctrina/contracts/system.md",
  ".doctrina/skills/importar-nota.md",
];

test("every artifact kind is caught when emptied", () => {
  const dir = fullProject();
  try {
    for (const rel of KINDS) {
      const full = path.join(dir, rel);
      const original = readFileSync(full, "utf8");
      writeFileSync(full, "");
      const out = run(dir, ["validate"]);
      assert.equal(out.status, 1, `an empty ${rel} passed validate`);
      assert.match(out.stdout + out.stderr, new RegExp(`${rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} is empty`));
      writeFileSync(full, original);
    }
    // And the tree is clean again once every file is restored.
    assert.equal(run(dir, ["validate"]).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("whitespace is not content either", () => {
  const dir = fullProject();
  try {
    const full = path.join(dir, ".doctrina", "specs", "carteira", "spec.md");
    const original = readFileSync(full, "utf8");
    writeFileSync(full, "\n\n   \n\t\n");
    const out = run(dir, ["validate"]);
    assert.equal(out.status, 1);
    assert.match(out.stdout + out.stderr, /is empty/);
    writeFileSync(full, original);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a file with content but no title is not an artifact", () => {
  const dir = fullProject();
  try {
    const full = path.join(dir, ".doctrina", "specs", "carteira", "spec.md");
    writeFileSync(full, "lixo qualquer\nmais lixo\n");
    const out = run(dir, ["validate"]);
    assert.equal(out.status, 1);
    assert.match(out.stdout + out.stderr, /carries no title/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a title inside a comment does not count as a title", () => {
  // The document model owns that rule (change 0055), and this check reads
  // through it rather than carrying its own idea of what a comment is.
  const dir = fullProject();
  try {
    const full = path.join(dir, ".doctrina", "specs", "carteira", "spec.md");
    writeFileSync(full, "<!--\n# Spec — carteira\n-->\nalgum texto\n");
    const out = run(dir, ["validate"]);
    assert.equal(out.status, 1);
    assert.match(out.stdout + out.stderr, /carries no title/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the file list covers every kind the framework owns", () => {
  const dir = fullProject();
  try {
    const listed = artifactFiles(dir);
    for (const rel of KINDS) {
      assert.ok(listed.includes(rel), `${rel} is not in the artifact list`);
    }
    // The archive is history and stays out, like everywhere else.
    assert.ok(!listed.some((f) => f.includes("/archive/")), "the archive is excluded");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("this repository's own artifacts all carry content", () => {
  const repoRoot = path.resolve(here, "..", "..", "..");
  const empty = artifactFiles(repoRoot).filter(
    (rel) => readFileSync(path.join(repoRoot, rel), "utf8").trim() === "");
  assert.deepEqual(empty, []);
});
