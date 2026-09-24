// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// ONE GOAL, ONE ANCHOR.
//
// `intent add` refused only a colliding PINNED id, never a colliding text, so
// the same sentence added twice (an agent re-running a playbook step is
// enough) became two anchors for one goal. A spec realizes one of them; the
// twin stays "dropped" for good, and `trace --strict` — a CI gate — fails on
// a gap no spec can honestly close. `validate` did not see the twin either.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-intent-twin-"));
  assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
  return dir;
}

const productMd = (dir) => path.join(dir, ".doctrina", "product.md");
const anchorCount = (dir) =>
  (readFileSync(productMd(dir), "utf8").match(/^\s*[-*]\s+\[[A-Z]+\d+\]/gm) ?? []).length;

test("the same intent added twice is refused, naming the anchor that already states it", () => {
  const dir = project();
  try {
    const first = runCli(["intent", "add", "A carteira soma certo"], dir);
    assert.equal(first.status, 0, first.stderr || first.stdout);
    const before = anchorCount(dir);
    for (const twin of ["A carteira soma certo", "a carteira soma certo.", "A cartéira  SOMA certo", "SC7: A carteira soma certo"]) {
      const r = runCli(["intent", "add", twin], dir);
      assert.equal(r.status, 1, `"${twin}" is the same goal — ${r.stdout}`);
      assert.match(r.stderr, /\[SC1\] already states this intent/);
      assert.equal(anchorCount(dir), before, `"${twin}" wrote nothing`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a different intent is still added", () => {
  const dir = project();
  try {
    assert.equal(runCli(["intent", "add", "A carteira soma certo"], dir).status, 0);
    const r = runCli(["intent", "add", "A carteira soma errado"], dir);
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.match(r.stdout, /added \[SC2\]/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// A twin written by hand (or left by an older CLI) is what `validate` reports.
test("validate warns on a hand-written twin, pointing at the first anchor", () => {
  const dir = project();
  try {
    assert.equal(runCli(["intent", "add", "A carteira soma certo"], dir).status, 0);
    writeFileSync(productMd(dir), readFileSync(productMd(dir), "utf8") + "- [SC9] a carteira soma certo.\n");
    const r = runCli(["validate"], dir);
    assert.match(r.stdout + r.stderr, /intent \[SC9\] states the same intent as \[SC1\]/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
