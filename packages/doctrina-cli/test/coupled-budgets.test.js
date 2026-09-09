import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { agentsMdBudget, AGENTS_MD_SOFT_LIMIT } from "../src/lib/validation-model.js";
import { surfaceBudget } from "../src/lib/templates-model.js";

// Change 0072 — the coupling between the two budgets is visible.
//
// AGENTS.md reached 150 of 150 lines and the generated surface block 37 of
// 40. One of them is not a separate problem from the other: the block is
// written INTO AGENTS.md, so the next command added to the catalog spends a
// line of each. And `agents-md-lines` is declared OUTPUT, so `analyze`
// refuses — correctly — the raise-the-ceiling fix. The only remedy is to
// send less, which is a choice while there is slack and a scramble once
// there is none. So the slack is now reported BEFORE it runs out, and both
// numbers come from one owner rather than from a count at each call site.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const repoRoot = path.resolve(here, "..", "..", "..");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-budgets-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  return dir;
}

const agentsPath = (dir) => path.join(dir, "AGENTS.md");

// Grow AGENTS.md to exactly `lines` lines. Prose, not blanks: `lineCount`
// counts what is in the file, and padding with something readable keeps the
// fixture honest about what the budget is spent on.
function padTo(dir, lines) {
  const file = agentsPath(dir);
  const body = readFileSync(file, "utf8").split(/\r?\n/);
  while (body.length < lines) body.push(`- padding line ${body.length}`);
  writeFileSync(file, body.slice(0, lines).join("\n"));
  assert.equal(agentsMdBudget(dir).used, lines);
}

const budgetRow = (dir) => {
  const out = run(dir, ["doctor"]).stdout;
  const line = out.split("\n").find((l) => /\bbudgets\b/.test(l));
  assert.ok(line, `doctor printed no budgets row:\n${out}`);
  return line;
};

test("doctor reports the two coupled budgets before either is breached", () => {
  const dir = project();
  try {
    // A freshly scaffolded AGENTS.md is well inside both ceilings.
    assert.match(budgetRow(dir), /\bok\b/);

    const soft = agentsMdBudget(dir).soft;
    padTo(dir, soft - 1);
    const row = budgetRow(dir);
    assert.match(row, /warn/);
    assert.match(row, /1 line of headroom/);
    // The warning names the coupling, not just one of the numbers: the cost
    // of the NEXT command is what makes the slack actionable.
    assert.match(row, /spends a line of each/);
    assert.match(row, /surface block \d+\/\d+/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the overflow warning still fires once a ceiling is past", () => {
  const dir = project();
  try {
    padTo(dir, agentsMdBudget(dir).soft + 1);
    const row = budgetRow(dir);
    assert.match(row, /warn/);
    assert.match(row, /over a declared ceiling/);
    // And the remedy is still the only one the OUTPUT direction allows.
    const fix = run(dir, ["doctor"]).stdout.split("\n");
    const i = fix.findIndex((l) => /\bbudgets\b/.test(l));
    assert.match(fix[i + 1], /raising them is refused/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("doctor and templates check quote ONE size for the surface block", () => {
  const dir = project();
  try {
    const fromDoctor = budgetRow(dir).match(/surface block (\d+)\/(\d+)/);
    const fromTemplates = run(dir, ["templates", "check"]).stdout
      .match(/surface block within budget \((\d+)\/(\d+) lines\)/);
    assert.ok(fromDoctor && fromTemplates, "both surfaces must report the block size");
    assert.deepEqual(fromDoctor.slice(1, 3), fromTemplates.slice(1, 3));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a declared ceiling beats the literal, for BOTH budgets", () => {
  const dir = project();
  try {
    const contracts = path.join(dir, ".doctrina", "contracts");
    mkdirSync(contracts, { recursive: true });
    writeFileSync(path.join(contracts, "sizes.md"), [
      "# Contract — sizes", "", "## Budgets", "",
      "| Limit               | Direction | Value |",
      "|---------------------|-----------|-------|",
      "| agents-md-lines     | output    | 90    |",
      "| surface-block-lines | output    | 200   |",
      "",
    ].join("\n"));

    assert.equal(agentsMdBudget(dir).soft, 90);
    assert.equal(agentsMdBudget(dir).declared, true);
    assert.equal(surfaceBudget(dir).budget, 200);
    assert.equal(surfaceBudget(dir).declared, true);
    assert.match(budgetRow(dir), /\/90 lines/);
    assert.match(budgetRow(dir), /surface block \d+\/200/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a project that declares nothing falls back to the shipped defaults", () => {
  const dir = project();
  try {
    assert.equal(agentsMdBudget(dir).soft, AGENTS_MD_SOFT_LIMIT);
    assert.equal(agentsMdBudget(dir).declared, false);
    assert.equal(surfaceBudget(dir).declared, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("this repository declares both ceilings in its own contract", () => {
  // The coupling is only reportable where it is declared. Doctrina uses
  // itself, so its own contract is the fixture that keeps the rows honest.
  assert.equal(agentsMdBudget(repoRoot).declared, true);
  assert.equal(surfaceBudget(repoRoot).declared, true);
});
