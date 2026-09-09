import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { changeEntry } from "../src/lib/scan.js";

// Change 0076 — one constructor for one record shape.
//
// `change-ops` assembled a change's index entry by hand while `scan.js`
// derived it from the proposal. The `lane` field (change 0042) was added to
// the deriver and not to the writer, so the two disagreed the moment a change
// was opened — and `doctrina work`, the command AGENTS.md names for every
// request, left the tree failing `validate` on the very next command.
//
// The ordering made the omission unfixable in place: `work` indexed the
// change BEFORE stamping the lane it had just classified, so at write time
// there was no lane in the proposal to read.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-entry-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira de acoes"]).status, 0);
  return dir;
}

const index = (dir) => JSON.parse(readFileSync(path.join(dir, ".doctrina", "index.json"), "utf8"));
const changes = (dir) => index(dir).artifacts.changes;
const proposal = (dir, id) =>
  readFileSync(path.join(dir, ".doctrina", "changes", id, "proposal.md"), "utf8");

test("doctrina work leaves a tree that validates", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["work", "importar nota de corretagem", "--title", "importa a nota",
      "--quiet"]).status, 0);

    const v = run(dir, ["validate"]);
    assert.equal(v.status, 0, v.stdout + v.stderr);
    assert.doesNotMatch(v.stdout + v.stderr, /metadata differs/);

    // The lane the classifier read reached the index, not only the proposal.
    const [entry] = changes(dir);
    assert.ok(entry.lane, "the entry carries the lane the proposal records");
    assert.ok(proposal(dir, entry.id).includes(`- **Lane:** ${entry.lane}`),
      "the index records the lane the proposal states, verbatim");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a pinned capability also lands without drift", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
    assert.equal(run(dir, ["work", "calcula o preco medio", "--capability", "carteira",
      "--title", "preco medio", "--quiet"]).status, 0);
    const v = run(dir, ["validate"]);
    assert.equal(v.status, 0, v.stdout + v.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("change new records no lane, and still does not drift", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["change", "new", "0001-manual", "manual"]).status, 0);
    const v = run(dir, ["validate"]);
    assert.equal(v.status, 0, v.stdout + v.stderr);
    // Absence is the honest answer for a change nobody classified — not a
    // default lane that would poison the calibration set.
    assert.equal(changes(dir)[0].lane, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the entry the writer stores is the entry the deriver would build", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["work", "importar nota de corretagem", "--title", "importa a nota",
      "--quiet"]).status, 0);
    const stored = changes(dir);
    assert.equal(stored.length, 1);
    const [entry] = stored;
    assert.deepEqual(entry, changeEntry(proposal(dir, entry.id), entry.id, null, entry.opened));

    // And the rebuild agrees, which is what `validate` compares.
    assert.equal(run(dir, ["index", "rebuild"]).status, 0);
    assert.deepEqual(changes(dir), stored);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("re-deriving an entry replaces it rather than duplicating it", async () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["work", "importar nota", "--title", "importa a nota",
      "--quiet"]).status, 0);
    const { reindexChange } = await import("../src/lib/change-ops.js");
    reindexChange(dir, "0001-importa-a-nota");
    reindexChange(dir, "0001-importa-a-nota");
    assert.equal(changes(dir).filter((c) => c.id === "0001-importa-a-nota").length, 1);
    assert.equal(run(dir, ["validate"]).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
