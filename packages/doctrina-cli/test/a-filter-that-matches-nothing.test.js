import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Change 0090 — a filter that matches nothing does not approve.
//
// On this repository, which declares over two hundred acceptance criteria:
//
//     $ doctrina coverage --only naoexiste --strict ; echo $?
//     no acceptance criteria found under .doctrina/specs/
//     0
//
// Two things wrong in one line. The sentence claims there are no criteria
// under `.doctrina/specs/` — there are hundreds — and `--strict`, which
// exists to be the CI gate, approves a measurement that measured nothing. A
// job running `coverage --only billing --strict` stays green forever once
// that capability is renamed or split.
//
// RT05 already refuses a contract selector matching zero targets, with the
// same reasoning: a run dispatched on it executes 0 cases and exits 0.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const repoRoot = path.resolve(here, "..", "..", "..");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-only-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira"]).status, 0);
  assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
  assert.equal(run(dir, ["index", "rebuild"]).status, 0);
  return dir;
}

test("a filter naming no capability is refused, not approved", () => {
  const dir = project();
  try {
    const out = run(dir, ["coverage", "--only", "naoexiste", "--strict"]);
    assert.equal(out.status, 2, "a usage error, not a passing gate");
    assert.match(out.stderr, /--only names no capability with a spec: "naoexiste"/);
    assert.match(out.stderr, /known: carteira/);
    assert.equal(out.stdout, "", "no verdict is printed for a measurement that did not happen");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a near miss is named", () => {
  const dir = project();
  try {
    const out = run(dir, ["coverage", "--only", "carteria"]);
    assert.equal(out.status, 2);
    assert.match(out.stderr, /did you mean "carteira"\?/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("one bad name in a list is enough to refuse", () => {
  const dir = project();
  try {
    const out = run(dir, ["coverage", "--only", "carteira,naoexiste", "--strict"]);
    assert.equal(out.status, 2, "a partial match must not silently narrow the gate");
    assert.match(out.stderr, /naoexiste/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a filter naming a real capability still works", () => {
  const dir = project();
  try {
    const out = run(dir, ["coverage", "--only", "carteira"]);
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.match(out.stdout, /acceptance criteria/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an empty tree and an empty capability say different things", () => {
  const dir = project();
  try {
    // The capability exists but declares no criteria: that is not "the tree
    // has none", and the two used to share the false sentence.
    const spec = path.join(dir, ".doctrina", "specs", "carteira", "spec.md");
    // `\r?\n`: the scaffolded spec is CRLF on a Windows checkout, so this
    // emptied nothing and the case measured a spec that still declared its
    // placeholder criterion. Asserted, not trusted — a fixture edit that
    // matches nothing must fail here rather than downstream.
    const original = readFileSync(spec, "utf8");
    const emptied = original.replace(/(## Acceptance criteria\r?\n)[\s\S]*?(\r?\n## |$)/, "$1\n$2");
    assert.notEqual(emptied, original, "the fixture did not empty the criteria section");
    writeFileSync(spec, emptied);
    assert.equal(run(dir, ["index", "rebuild"]).status, 0);

    const out = run(dir, ["coverage", "--only", "carteira"]);
    assert.equal(out.status, 0);
    assert.match(out.stdout, /no acceptance criteria declared by carteira/);
    assert.doesNotMatch(out.stdout, /found under \.doctrina\/specs\//);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("this repository refuses the filter instead of approving it", () => {
  const out = run(repoRoot, ["coverage", "--only", "naoexiste", "--strict"]);
  assert.equal(out.status, 2);
  // And the tree it claimed was empty is demonstrably not.
  const full = run(repoRoot, ["coverage"]);
  assert.match(full.stdout, /of \d{2,} acceptance criteria/);
});
