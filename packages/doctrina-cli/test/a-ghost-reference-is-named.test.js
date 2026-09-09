import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Change 0108 — uma referência fantasma é apontada.
//
// `**Depends on:** carteira, fantasma` passed validate, review, analyze and
// close in silence; `why` printed it, `context` dropped it. `**Affects
// specs:** carteira, fantasma` in a proposal: the same silence. A second
// `- [SC1] ...` bullet in product.md was deduplicated on read, so the second
// intent vanished from every view while `trace --strict` stayed green.
// Contrast `Realizes: SC9`, which trace names as dangling. One class of
// reference — a name for an artifact — had a gate in one header and none in
// the other three.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-ghost-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira de investimentos"]).status, 0);
  assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
  assert.equal(run(dir, ["spec", "new", "relatorio"]).status, 0);
  return dir;
}

function editSpec(dir, cap, from, to) {
  const p = path.join(dir, ".doctrina", "specs", cap, "spec.md");
  const before = readFileSync(p, "utf8");
  const after = before.replace(from, to);
  assert.notEqual(after, before, `${cap}: the edit landed`);
  writeFileSync(p, after);
}

test("Depends on a capability with no spec is a validate error naming the remedy", () => {
  const dir = project();
  editSpec(dir, "relatorio", "**Capability:** relatorio", "**Capability:** relatorio\n**Depends on:** carteira, fantasma");
  assert.equal(run(dir, ["index", "rebuild"]).status, 0);
  const res = run(dir, ["validate"]);
  assert.equal(res.status, 1);
  assert.match(res.stdout, /error: .*specs\/relatorio\/spec\.md: Depends on "fantasma", which has no spec .*doctrina spec new fantasma/);
  assert.doesNotMatch(res.stdout, /Depends on "carteira"/);
});

test("Affects specs naming a ghost warns, unless the change carries an ADDED delta for it", () => {
  const dir = project();
  assert.equal(run(dir, ["change", "new", "0001-x", "X"]).status, 0);
  const proposal = path.join(dir, ".doctrina", "changes", "0001-x", "proposal.md");
  const before = readFileSync(proposal, "utf8");
  const after = before.replace(/- \*\*Affects specs:\*\*[^\r\n]*/, "- **Affects specs:** carteira, fantasma");
  assert.notEqual(after, before);
  writeFileSync(proposal, after);
  let res = run(dir, ["validate"]);
  assert.match(res.stdout, /warn: .*open change "0001-x" Affects specs: names "fantasma", which has no spec and no delta/);

  mkdirSync(path.join(dir, ".doctrina", "changes", "0001-x", "specs", "fantasma"), { recursive: true });
  writeFileSync(path.join(dir, ".doctrina", "changes", "0001-x", "specs", "fantasma", "delta.md"),
    "# Spec Delta — capability: fantasma\n\n**Operation:** ADDED\n**Target spec on apply:** `.doctrina/specs/fantasma/spec.md`\n\n---\n\n# Spec — fantasma\n");
  res = run(dir, ["validate"]);
  assert.doesNotMatch(res.stdout, /names "fantasma"/, "a capability the change creates is not a ghost");
});

test("an intent anchor declared twice is a validate error and trace names it", () => {
  const dir = project();
  const productPath = path.join(dir, ".doctrina", "product.md");
  const before = readFileSync(productPath, "utf8");
  const after = before.replace(/## Success criteria[^\n]*\n/, (h) => `${h}\n- [SC1] Todo aporte aparece no patrimônio.\n- [SC1] O relatório sai em PDF.\n`);
  assert.notEqual(after, before);
  writeFileSync(productPath, after);
  editSpec(dir, "carteira", /\*\*Realizes:\*\*[^\r\n]*/, "**Realizes:** SC1");
  assert.equal(run(dir, ["index", "rebuild"]).status, 0);

  const validate = run(dir, ["validate"]);
  assert.equal(validate.status, 1);
  assert.match(validate.stdout, /error: .*product\.md:\d+ intent anchor \[SC1\] is declared twice \(first at line \d+\)/);

  const trace = run(dir, ["trace", "--strict"]);
  assert.equal(trace.status, 1);
  assert.match(trace.stdout, /duplicate anchor \[SC1\]/);
});
