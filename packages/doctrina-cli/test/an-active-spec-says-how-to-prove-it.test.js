import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Change 0091 — an active spec says how to prove it.
//
// A 119-line spec, `Status: active`, EARS requirements written, and the
// `## Acceptance criteria` section present and empty. Measured across the
// surfaces on that one tree:
//
//     clarify            fail — 1 smell
//     doctor             warn — no acceptance criteria declared yet
//     status             no criteria declared (0/0)
//     coverage --strict  exit 0
//     validate           ok all validation checks passed
//
// Three surfaces knew. The two a pipeline runs approved. The information was
// already in the tree — the gate that decides was the one not using it.
//
// Scoped to ACTIVE, symmetrically with the two-axis status check: a spec
// still being drawn may not know how to prove anything yet, and `draft` is
// the state `spec new` already scaffolds into.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const repoRoot = path.resolve(here, "..", "..", "..");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

const specPath = (dir, cap) => path.join(dir, ".doctrina", "specs", cap, "spec.md");

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-criteria-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira"]).status, 0);
  assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
  return dir;
}

// Empty the criteria section, keeping its heading — the shape `spec new`
// leaves behind once someone deletes the placeholder.
function emptyCriteria(dir, cap, status) {
  const p = specPath(dir, cap);
  // `\r?\n`, not `\n`: the scaffolded spec is CRLF on a Windows checkout, so
  // the literal-newline pattern matched nothing, the section was never
  // emptied, and both cases below asserted against an untouched spec.
  const original = readFileSync(p, "utf8");
  let text = original
    .replace(/(## Acceptance criteria\r?\n)[\s\S]*?(\r?\n## |$)/, "$1\n$2");
  // A fixture that transforms something is held to having transformed it.
  // With the `\n`-anchored pattern this matched nothing on a CRLF checkout,
  // the section was never emptied, and both cases below asserted happily
  // against an untouched spec — green about a setup that never happened.
  assert.notEqual(text, original, "the fixture did not empty the criteria section");
  if (status) text = text.replace(/\*\*Status:\*\*.*/, `**Status:** ${status}`);
  writeFileSync(p, text);
  assert.equal(run(dir, ["index", "rebuild"]).status, 0);
}

test("an active spec with no criteria fails the structural gate", () => {
  const dir = project();
  try {
    emptyCriteria(dir, "carteira", "active");
    const out = run(dir, ["validate"]);
    assert.equal(out.status, 1, "validate approved a capability nobody can prove");
    assert.match(out.stdout + out.stderr, /declares no acceptance criterion/);
    assert.match(out.stdout + out.stderr, /Status: draft while it is still being drawn/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a draft spec with no criteria still passes", () => {
  // The bootstrap must not be blocked: `spec new` scaffolds into draft, and a
  // capability being drawn may not know how to prove anything yet.
  const dir = project();
  try {
    emptyCriteria(dir, "carteira", "draft");
    assert.equal(run(dir, ["validate"]).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a missing section is the same failure as an empty one", () => {
  const dir = project();
  try {
    const p = specPath(dir, "carteira");
    writeFileSync(p, readFileSync(p, "utf8")
      .replace(/## Acceptance criteria[\s\S]*$/, "")
      .replace(/\*\*Status:\*\*.*/, "**Status:** active"));
    assert.equal(run(dir, ["index", "rebuild"]).status, 0);
    assert.equal(run(dir, ["validate"]).status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an active spec that declares criteria passes", () => {
  const dir = project();
  try {
    const p = specPath(dir, "carteira");
    writeFileSync(p, readFileSync(p, "utf8")
      .replace(/\*\*Status:\*\*.*/, "**Status:** active")
      .replace(/(## Acceptance criteria\n)[\s\S]*?(\n## |$)/,
        "$1\n1. [unverified] O preco medio e recalculado a cada aporte — verified by `src/carteira.js`.\n$2"));
    assert.equal(run(dir, ["index", "rebuild"]).status, 0);
    const out = run(dir, ["validate"]);
    assert.doesNotMatch(out.stdout + out.stderr, /declares no acceptance criterion/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the surfaces stop disagreeing about the same tree", () => {
  const dir = project();
  try {
    emptyCriteria(dir, "carteira", "active");
    // clarify already failed, doctor already warned; now the gate agrees.
    assert.equal(run(dir, ["clarify", "--all"]).status, 1);
    assert.match(run(dir, ["doctor"]).stdout, /no acceptance criteria declared yet/);
    assert.equal(run(dir, ["validate"]).status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("this repository's own specs all declare criteria", () => {
  const out = run(repoRoot, ["validate"]);
  assert.doesNotMatch(out.stdout + out.stderr, /declares no acceptance criterion/);
  assert.equal(out.status, 0);
});
