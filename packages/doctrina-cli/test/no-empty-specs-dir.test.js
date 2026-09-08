import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Change 0081 — a change carries no empty `specs/`.
//
// `change new` created the directory unconditionally, as somewhere "ready"
// for deltas. When the CLI could not name a capability — a new prompt, or a
// project whose specs do not match it — nothing was ever written into it.
// `analyze` read that correctly as "0 spec deltas (metadata-only change)",
// so nothing broke; the directory simply asserted something untrue. Same
// principle as change 0073: an empty directory is not an absence, it is a
// presence with no content, and the next reader spends attention on it.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-specsdir-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira de acoes"]).status, 0);
  return dir;
}

const changeDir = (dir, id) => path.join(dir, ".doctrina", "changes", id);

test("a change with no resolved capability carries no specs directory", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["work", "importar nota de corretagem em PDF",
      "--title", "importa a nota", "--quiet"]).status, 0);
    const here_ = changeDir(dir, "0001-importa-a-nota");
    assert.deepEqual(readdirSync(here_).sort(), ["proposal.md", "tasks.md"]);
    assert.equal(existsSync(path.join(here_, "specs")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a pinned capability still gets its delta, in its own directory", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
    assert.equal(run(dir, ["work", "calcula o preco medio", "--capability", "carteira",
      "--title", "preco medio", "--quiet"]).status, 0);
    const here_ = changeDir(dir, "0001-preco-medio");
    assert.equal(existsSync(path.join(here_, "specs", "carteira", "delta.md")), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("change new leaves only the two files it writes", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["change", "new", "0001-manual", "manual"]).status, 0);
    assert.deepEqual(readdirSync(changeDir(dir, "0001-manual")).sort(),
      ["proposal.md", "tasks.md"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("analyze, change check and validate are unaffected", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["work", "importar nota", "--title", "importa a nota",
      "--quiet"]).status, 0);
    // The absent directory is still read as a metadata-only change, exactly
    // as the empty one was.
    assert.match(run(dir, ["analyze", "0001-importa-a-nota"]).stdout,
      /0 spec deltas \(metadata-only change\)/);
    assert.equal(run(dir, ["validate"]).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
