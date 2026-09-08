import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Change 0083 — trace does not approve the empty tree.
//
// `spec new` scaffolds the `**Realizes:**` header with a placeholder value,
// which cites no anchor id. The never-opted-in guard tested for the HEADER,
// not for a cited anchor, so one scaffolded spec was enough to leave that
// branch and enter the normal report — where zero anchors rendered as
//
//     ok 0 of 0 intent anchors realized; 0 dropped, 0 dangling, 0 untraceable
//
// exit 0, `--strict` included. A green verdict over nothing, on the first
// read a new project gets about itself, while `doctor` read the same
// collection and warned. Absence is not approval — the half change 0057
// fixed in `coverage` and left standing here.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-trace-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira"]).status, 0);
  return dir;
}

const specPath = (dir, cap) => path.join(dir, ".doctrina", "specs", cap, "spec.md");

function setRealizes(dir, cap, value) {
  const p = specPath(dir, cap);
  writeFileSync(p, readFileSync(p, "utf8").replace(/\*\*Realizes:\*\*.*/, `**Realizes:** ${value}`));
}

test("a scaffolded spec is not an opt-in, and zero anchors is not ok", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
    // The scaffold writes the header with a placeholder value; either way it
    // cites no anchor id, which is what "opted in" has to mean.
    const header = readFileSync(specPath(dir, "carteira"), "utf8")
      .match(/\*\*Realizes:\*\*.*/)[0];
    assert.equal(header.match(/[A-Z]+\d+/g), null, `the scaffold cites an anchor: ${header}`);

    const out = run(dir, ["trace"]);
    assert.equal(out.status, 0);
    assert.doesNotMatch(out.stdout, /ok 0 of 0/, "a green verdict over nothing");
    assert.doesNotMatch(out.stdout, /\bok\b/);
    assert.match(out.stdout, /no intent-provenance markers found/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("trace and doctor read the empty tree the same way", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
    // Neither claims success; both say the anchors are not there.
    assert.doesNotMatch(run(dir, ["trace"]).stdout, /\bok\b/);
    const doctor = run(dir, ["doctor"]).stdout;
    assert.match(doctor, /warn\s+trace\s+no intent anchors declared/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a real Realizes with no anchors is a gap, and fails --strict", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
    setRealizes(dir, "carteira", "SC1");

    const out = run(dir, ["trace"]);
    assert.match(out.stdout, /no intent anchors declared in product\.md/);
    assert.match(out.stdout, /1 dangling/);
    assert.doesNotMatch(out.stdout, /0 of 0/);
    assert.equal(run(dir, ["trace", "--strict"]).status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a declared and realized anchor is still green, and still exits 0", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
    setRealizes(dir, "carteira", "SC1");
    assert.equal(run(dir, ["intent", "add", "SC1: um aporte nunca se perde"]).status, 0);

    const out = run(dir, ["trace"]);
    assert.match(out.stdout, /ok 1 of 1 intent anchor realized/);
    assert.equal(run(dir, ["trace", "--strict"]).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a project that declared nothing at all is still not nagged", () => {
  // The guard exists so the bootstrap is not blocked by a feature nobody
  // opted into; that must survive the fix.
  const dir = project();
  try {
    const out = run(dir, ["trace", "--strict"]);
    assert.equal(out.status, 0);
    assert.match(out.stdout, /no intent-provenance markers found/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
