import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { agentsSectionCost, STUB_SECTION_LINES, collectFindings } from "../src/lib/templates-model.js";
import { agentsMdBudget } from "../src/lib/validation-model.js";

// Change 0078 — a recommendation states what it costs.
//
// `templates check` recommends the AGENTS.md sections and `agents-md-lines`
// caps the file, and the two never spoke. The remedy worked — it appended the
// stubs and cleared the finding — and on this very repository it took
// AGENTS.md from 147 to 155 lines, past a ceiling `analyze` refuses to raise
// because the budget is declared OUTPUT. One advisory gate sent you straight
// into another gate's refusal, and neither mentioned the other.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-cost-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira"]).status, 0);
  return dir;
}

const agents = (dir) => path.join(dir, "AGENTS.md");
const lines = (dir) => readFileSync(agents(dir), "utf8").split(/\r?\n/).length;

// Rename the two recommended headings so they read as missing. GROWS the
// file when a size is asked for and never truncates it: cutting the tail
// removes further recommended sections and quietly changes what is being
// measured.
function withMissingSections(dir, targetLines = 0) {
  const file = agents(dir);
  const body = readFileSync(file, "utf8")
    .replace("## Commands\n", "## Build commands\n")
    .replace("## Repository structure\n", "## Layout\n")
    .split(/\r?\n/);
  while (body.length < targetLines) body.push(`- padding ${body.length}`);
  writeFileSync(file, body.join("\n"));
}

// Declare a roomier ceiling in this project's own contract, so the "with
// room" cases do not depend on how long the shipped AGENTS.md happens to be.
function declareCeiling(dir, value) {
  const contracts = path.join(dir, ".doctrina", "contracts");
  mkdirSync(contracts, { recursive: true });
  writeFileSync(path.join(contracts, "sizes.md"), [
    "# Contract — sizes", "", "## Budgets", "",
    "| Limit           | Direction | Value |",
    "|-----------------|-----------|-------|",
    `| agents-md-lines | output    | ${value}   |`, "",
  ].join("\n"));
}

// How many recommended sections the project is actually missing — asserting
// against a hardcoded 2 is how the first version of this test measured a
// truncated fixture instead of the behaviour.
const missingCount = (dir) =>
  collectFindings(dir).findings.filter((f) => /missing recommended section/.test(f.message)).length;

test("with room, the recommendation is unchanged and its remedy applies", () => {
  const dir = project();
  try {
    withMissingSections(dir);
    declareCeiling(dir, 400);
    const before = lines(dir);
    const missing = missingCount(dir);
    assert.equal(missing, 2, "the fixture hides exactly the two headings it renamed");

    const check = run(dir, ["templates", "check"]);
    assert.match(check.stdout, /missing recommended section "## Commands"/);
    assert.doesNotMatch(check.stdout, /left of its declared ceiling/);

    assert.equal(run(dir, ["templates", "update", "--write"]).status, 0);
    assert.equal(lines(dir), before + missing * STUB_SECTION_LINES);
    assert.doesNotMatch(run(dir, ["templates", "check"]).stdout,
      /missing recommended section/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("without room, the finding names the cost and the remedy names the cut", () => {
  const dir = project();
  try {
    const soft = agentsMdBudget(dir).soft;
    withMissingSections(dir, soft - 3);       // 3 lines of slack, 8 lines of stubs

    const out = run(dir, ["templates", "check"]).stdout;
    assert.match(out, /the 2 missing stub\(s\) cost 8 lines and AGENTS\.md has 3 left/);
    assert.match(out, /cut 5 line\(s\) of prose from AGENTS\.md, then/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("without room, --write stands down instead of breaching the ceiling", () => {
  const dir = project();
  try {
    const soft = agentsMdBudget(dir).soft;
    withMissingSections(dir, soft - 3);
    const before = lines(dir);

    const out = run(dir, ["templates", "update", "--write"]);
    assert.equal(out.status, 0);
    assert.match(out.stdout, /held/);
    assert.match(out.stdout, /cut 5 line\(s\) of prose first/);
    assert.equal(lines(dir), before, "the file is untouched, not silently over budget");
    // And the ceiling is intact, which is the point: `analyze` refuses to
    // raise an OUTPUT budget, so breaching it has no legal fix.
    assert.ok(agentsMdBudget(dir).used <= soft);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("making the room clears the hold — the advice is followable", () => {
  const dir = project();
  try {
    const soft = agentsMdBudget(dir).soft;
    withMissingSections(dir, soft - 3);
    assert.match(run(dir, ["templates", "update", "--write"]).stdout, /held/);

    // Do exactly what the remedy said: cut 5 lines, then re-run.
    const body = readFileSync(agents(dir), "utf8").split(/\r?\n/);
    writeFileSync(agents(dir), body.slice(0, body.length - 5).join("\n"));

    const out = run(dir, ["templates", "update", "--write"]);
    assert.equal(out.status, 0);
    assert.doesNotMatch(out.stdout, /held/);
    assert.ok(agentsMdBudget(dir).used <= soft, "still inside the ceiling");
    assert.doesNotMatch(run(dir, ["templates", "check"]).stdout,
      /missing recommended section/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the cost estimate and the writer agree on what a stub costs", () => {
  const dir = project();
  try {
    withMissingSections(dir);
    declareCeiling(dir, 400);
    const before = lines(dir);
    const missing = ["## Commands", "## Repository structure"];
    assert.equal(missingCount(dir), missing.length);
    const { cost, slack, fits } = agentsSectionCost(dir, missing);
    assert.equal(fits, true);
    assert.equal(slack, agentsMdBudget(dir).slack);

    assert.equal(run(dir, ["templates", "update", "--write"]).status, 0);
    assert.equal(lines(dir) - before, cost,
      "an estimate the writer disagrees with is worse than no estimate");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("every finding still carries a remedy", () => {
  const dir = project();
  try {
    withMissingSections(dir, agentsMdBudget(dir).soft - 3);
    for (const f of collectFindings(dir).findings) {
      assert.ok(f.remedy, `finding without a remedy: ${f.message}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
