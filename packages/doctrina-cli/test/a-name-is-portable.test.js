import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { artifactNameError } from "../src/lib/names.js";

// Change 0110 — um nome de capability é portável.
//
// Three commands carried their own copy of the name grammar, and none knew
// anything about a file system. `spec new nul` created a directory git
// could neither see nor remove on Windows; a 120-character name made git
// say "Filename too long"; `trail-` and `a--b` passed. One grammar, in
// lib/names.js, read by `spec new`, `contract new` and `skill new`, with
// the rule that failed in the message.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const repoRoot = path.resolve(here, "..", "..", "..");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

test("each rule is named, and a legal name passes", () => {
  assert.equal(artifactNameError("carteira", "capability"), null);
  assert.equal(artifactNameError("a-b-c1", "capability"), null);
  assert.match(artifactNameError("Carteira", "capability"), /lowercase/);
  assert.match(artifactNameError("1abc", "capability"), /start with a letter/);
  assert.match(artifactNameError("trail-", "capability"), /end with a hyphen/);
  assert.match(artifactNameError("a--b", "capability"), /doubled hyphen/);
  assert.match(artifactNameError("x".repeat(65), "capability"), /at most 64/);
  for (const reserved of ["nul", "con", "prn", "aux", "com1", "lpt9"]) {
    assert.match(artifactNameError(reserved, "capability"), /reserved device name/, reserved);
  }
});

test("spec new, contract new and skill new refuse the same names with exit 2 and create nothing", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-names-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira de investimentos"]).status, 0);
  const before = JSON.stringify([
    readdirSync(path.join(dir, ".doctrina", "specs")),
    existsSync(path.join(dir, ".doctrina", "contracts")) ? readdirSync(path.join(dir, ".doctrina", "contracts")) : [],
    readdirSync(path.join(dir, ".doctrina", "skills")),
  ]);
  for (const bad of ["nul", "com1", "trail-", "a--b", "x".repeat(65)]) {
    for (const cmd of [["spec", "new"], ["contract", "new"], ["skill", "new"]]) {
      const res = run(dir, [...cmd, bad]);
      assert.equal(res.status, 2, `${cmd.join(" ")} ${bad.slice(0, 10)}`);
      assert.match(res.stderr, /must|reserved/, `${cmd.join(" ")} ${bad.slice(0, 10)}`);
    }
  }
  const after = JSON.stringify([
    readdirSync(path.join(dir, ".doctrina", "specs")),
    existsSync(path.join(dir, ".doctrina", "contracts")) ? readdirSync(path.join(dir, ".doctrina", "contracts")) : [],
    readdirSync(path.join(dir, ".doctrina", "skills")),
  ]);
  assert.equal(after, before, "nothing was created");
  assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
});

test("every name this repository already uses passes the grammar", () => {
  const specs = readdirSync(path.join(repoRoot, ".doctrina", "specs")).filter((n) => !n.startsWith("."));
  const skills = readdirSync(path.join(repoRoot, ".doctrina", "skills")).filter((n) => n.endsWith(".md")).map((n) => n.replace(/\.md$/, ""));
  const contractsDir = path.join(repoRoot, ".doctrina", "contracts");
  const contracts = existsSync(contractsDir) ? readdirSync(contractsDir).filter((n) => n.endsWith(".md")).map((n) => n.replace(/\.md$/, "")) : [];
  for (const name of [...specs, ...skills, ...contracts]) {
    assert.equal(artifactNameError(name, "name"), null, name);
  }
});
