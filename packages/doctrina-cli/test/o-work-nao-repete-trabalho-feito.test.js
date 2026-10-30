// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { similarChanges } from "../src/lib/work-model.js";

// `work` DOES NOT OPEN WORK THAT IS ALREADY DONE (change 0215).
//
// A field review: changes 0077 and 0078 were implemented and archived, and
// the next request was "create the doctrina work" for them — an archived
// change is out of every default read. A request that mostly repeats a
// change open, or archived in the last two weeks, is held with the answer.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-similar-"));
  const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
  assert.equal(run(["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  const today = new Date().toISOString().slice(0, 10);
  const archived = path.join(dir, ".doctrina", "changes", "archive", `${today}-0077-complementar-cenarios-pagamento-administrativo`);
  mkdirSync(archived, { recursive: true });
  writeFileSync(path.join(archived, "proposal.md"),
    "# Change 0077-complementar-cenarios-pagamento-administrativo — Complementar cenários de pagamento e administrativo\n\n- **Status:** applied\n\n## Why\n\nFaltavam cenários Behave.\n");
  return { dir, run };
}

test("a request repeating a recently archived change is held, naming where it is", () => {
  const { dir, run } = project();
  try {
    const out = run(["work", "crie os devidos doctrina work para os cenários de pagamento e administrativo"]);
    assert.equal(out.status, 3, out.stdout + out.stderr);
    assert.match(out.stderr, /reads like a change that already exists/);
    assert.match(out.stderr, /0077-complementar-cenarios-pagamento-administrativo .* archived/);
    assert.match(out.stderr, /it is done: tell the human it is archived at \.doctrina\/changes\/archive\//);
    assert.ok(!existsSync(path.join(dir, ".doctrina", "changes", "0078-devidos-doctrina-work-cenarios")), "nothing scaffolded");

    // New work goes through; --force overrides a false match.
    assert.equal(run(["work", "--chore", "rotate the API keys", "--quiet"]).status, 0);
    assert.equal(run(["work", "--force", "--chore", "cenários de pagamento e administrativo em outro módulo", "--quiet"]).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an open change is offered for resuming, and an unrelated prompt matches nothing", () => {
  const { dir, run } = project();
  try {
    assert.equal(run(["change", "new", "0100-ranking-participantes-open-finance", "Ranking de participantes Open Finance"]).status, 0);
    const out = run(["work", "ranking dos participantes do open finance"]);
    assert.equal(out.status, 3);
    assert.match(out.stderr, /doctrina work --resume 0100-ranking-participantes-open-finance/);
    assert.deepEqual(similarChanges(dir, "export invoices as CSV"), []);
    // A word shared only with the Why does not count toward the title's cover.
    assert.deepEqual(similarChanges(dir, "behave work trabalho repetido"), []);
    // Two shared words between short prompts are not the same work.
    assert.deepEqual(similarChanges(dir, "ranking participantes de outra coisa"), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
