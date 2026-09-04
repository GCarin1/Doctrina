import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, readFileSync, readdirSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { draftFromError } from "../src/commands/skill.js";

// The three remaining halves of change 0029: orchestration criteria (an
// acceptance claim about a RUN, proven by a fail-closed check rather than by
// a resolving citation), budget discipline in analyze, and a skill drafted
// from the error that taught the lesson.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-orch-"));
  const res = run(dir, ["init", "--project-description", "a fixture project"]);
  assert.equal(res.status, 0, `init failed: ${res.stderr}`);
  return dir;
}

function writeSpec(dir, cap, criteria) {
  const specDir = path.join(dir, ".doctrina", "specs", cap);
  mkdirSync(specDir, { recursive: true });
  writeFileSync(path.join(specDir, "spec.md"), [
    `# Spec — ${cap}`,
    "",
    `**Capability:** ${cap}`,
    "**Status:** active",
    "**Implementation:** implemented",
    "**Version:** 0.1.0",
    "",
    "## Purpose",
    "",
    "x",
    "",
    "## Acceptance criteria",
    "",
    criteria,
    "",
  ].join("\n"));
}

function coverageJson(dir) {
  const res = run(dir, ["coverage", "--json"]);
  return JSON.parse(res.stdout);
}

// ------------------------------------------------- orchestration criteria

test("an orchestration criterion citing no verify check is UNGUARDED", () => {
  const dir = project();
  try {
    writeSpec(dir, "obs", "1. [orchestration] the suite actually executes scenarios.");
    const payload = coverageJson(dir);
    const row = payload.specs[0].criteria[0];
    assert.equal(row.kind, "unguarded");
    assert.match(row.reason, /fail-closed/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("citing a verify check that declares no expect guard is UNGUARDED", () => {
  const dir = project();
  try {
    writeSpec(dir, "obs", "1. [orchestration] the suite runs — verified by `verify:e2e`.");
    writeFileSync(
      path.join(dir, ".doctrina", "verify.json"),
      `${JSON.stringify({ checks: [{ name: "e2e", run: "behave" }] }, null, 2)}\n`,
    );
    const row = coverageJson(dir).specs[0].criteria[0];
    assert.equal(row.kind, "unguarded");
    // The reason must name WHY a passing check is not proof here.
    assert.match(row.reason, /exits 0 having run nothing/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the same criterion is COVERED once the check declares its guard", () => {
  const dir = project();
  try {
    writeSpec(dir, "obs", "1. [orchestration] the suite runs — verified by `verify:e2e`.");
    writeFileSync(
      path.join(dir, ".doctrina", "verify.json"),
      `${JSON.stringify({
        checks: [{ name: "e2e", run: "behave", expect: { fail_if_output_matches: "0 scenarios" } }],
      }, null, 2)}\n`,
    );
    const row = coverageJson(dir).specs[0].criteria[0];
    assert.equal(row.kind, "covered");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("citing a verify check that does not exist is DANGLING", () => {
  const dir = project();
  try {
    writeSpec(dir, "obs", "1. [orchestration] the suite runs — verified by `verify:nope`.");
    writeFileSync(
      path.join(dir, ".doctrina", "verify.json"),
      `${JSON.stringify({ checks: [{ name: "e2e", run: "behave" }] }, null, 2)}\n`,
    );
    const row = coverageJson(dir).specs[0].criteria[0];
    assert.equal(row.kind, "dangling");
    assert.deepEqual(row.missing, ["verify:nope"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an unguarded orchestration claim fails coverage --strict", () => {
  const dir = project();
  try {
    writeSpec(dir, "obs", "1. [orchestration] the suite actually executes scenarios.");
    const res = run(dir, ["coverage", "--strict"]);
    assert.equal(res.status, 1);
    assert.match(res.stdout, /unguarded/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an ordinary criterion is unaffected: existing behaviour is untouched", () => {
  const dir = project();
  try {
    writeSpec(dir, "obs", "1. [verified] it works — verified by `AGENTS.md`.");
    const row = coverageJson(dir).specs[0].criteria[0];
    assert.equal(row.kind, "covered");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ------------------------------------------------------- budget discipline

test("analyze refuses a change that resolves an overflow by raising an OUTPUT ceiling", () => {
  const dir = project();
  try {
    run(dir, ["contract", "new", "system"]);
    writeFileSync(
      path.join(dir, ".doctrina", "contracts", "system.md"),
      "# Contract — system\n\n**Status:** active\n\n## Budgets\n\n" +
      "| Limit | Direction | Value |\n|---|---|---|\n| ai-summary | output | 800 |\n",
    );
    run(dir, ["work", "--force", "widen the summary"]);
    const changes = path.join(dir, ".doctrina", "changes");
    const id = readdirSync(changes).find((f) => /^\d{4}-/.test(f));
    const proposal = path.join(changes, id, "proposal.md");
    const text = readFileSync(proposal, "utf8");
    writeFileSync(
      proposal,
      text.replace("## What", "## What\n\nRaise ai-summary to 2000 so the output stops overflowing.\n"),
    );
    const res = run(dir, ["analyze", id]);
    assert.equal(res.status, 1);
    assert.match(res.stdout, /raises the OUTPUT ceiling/);
    assert.match(res.stdout, /truncating what mattered/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("raising an INPUT ceiling is an ordinary trade-off, not a refusal", () => {
  const dir = project();
  try {
    run(dir, ["contract", "new", "system"]);
    writeFileSync(
      path.join(dir, ".doctrina", "contracts", "system.md"),
      "# Contract — system\n\n**Status:** active\n\n## Budgets\n\n" +
      "| Limit | Direction | Value |\n|---|---|---|\n| ai-pack | input | 12000 |\n",
    );
    run(dir, ["work", "--force", "widen the pack"]);
    const changes = path.join(dir, ".doctrina", "changes");
    const id = readdirSync(changes).find((f) => /^\d{4}-/.test(f));
    const proposal = path.join(changes, id, "proposal.md");
    const text = readFileSync(proposal, "utf8");
    writeFileSync(
      proposal,
      text.replace("## What", "## What\n\nRaise ai-pack to 20000 to fit the new sources.\n"),
    );
    const res = run(dir, ["analyze", id]);
    assert.doesNotMatch(res.stdout, /raises the OUTPUT ceiling/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ------------------------------------------------ a skill drafted from an error

test("draftFromError builds a trigger out of the error's own anchors", () => {
  const draft = draftFromError([
    "Traceback (most recent call last):",
    '  File "app/config.py", line 42, in load',
    '    raise ValueError("AXE_SEVERITY must be one of none|critical|serious")',
  ].join("\n"));
  assert.ok(draft.paths.includes("app/config.py"));
  assert.ok(draft.identifiers.includes("AXE_SEVERITY"));
  assert.match(draft.when, /AXE_SEVERITY/);
  assert.match(draft.when, /app\/config\.py/);
});

test("the drafted slug does not repeat the same token in two forms", () => {
  const draft = draftFromError('ValueError: AXE_SEVERITY invalid — axe_severity must be set');
  const parts = draft.slug.split("-");
  assert.equal(new Set(parts).size, parts.length, `slug repeats a token: ${draft.slug}`);
});

test("a path already captured is not repeated as a quoted anchor", () => {
  const draft = draftFromError('File "features/checkout.feature" not found');
  const quotedPathCount = (draft.when.match(/features\/checkout\.feature/g) ?? []).length;
  assert.equal(quotedPathCount, 1, `path repeated in trigger: ${draft.when}`);
});

test("draftFromError returns null for nothing to draft from", () => {
  assert.equal(draftFromError(""), null);
  assert.equal(draftFromError("   \n  "), null);
});

test("skill suggest --from-error scaffolds a skill whose trigger is matchable", () => {
  const dir = project();
  try {
    const res = run(dir, [
      "skill", "suggest", "--write",
      "--from-error", 'behave: no scenarios matched tag @smoke-test in features/checkout.feature',
    ]);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /created/);
    // validate must not then warn that the generated trigger is undetectable.
    const v = run(dir, ["validate", "--json"]);
    const payload = JSON.parse(v.stdout);
    const triggerWarnings = payload.warnings.filter((w) => /no detectable trigger/.test(w));
    assert.deepEqual(triggerWarnings, [], "a generated trigger must satisfy the trigger check");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--from-error with no text is a usage error", () => {
  const dir = project();
  try {
    const res = run(dir, ["skill", "suggest", "--from-error"]);
    assert.equal(res.status, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ------------------------------------------------ skill triggers in validate

test("validate warns on a skill whose when: names nothing matchable", () => {
  const dir = project();
  try {
    const skills = path.join(dir, ".doctrina", "skills");
    mkdirSync(skills, { recursive: true });
    writeFileSync(path.join(skills, "vague.md"), [
      "---",
      "name: vague",
      "description: does a thing",
      "when: whenever it seems relevant",
      "---",
      "",
      "# Skill — vague",
      "",
    ].join("\n"));
    const payload = JSON.parse(run(dir, ["validate", "--json"]).stdout);
    assert.ok(payload.warnings.some((w) => /no detectable trigger/.test(w)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a concrete trigger passes the check", () => {
  const dir = project();
  try {
    const skills = path.join(dir, ".doctrina", "skills");
    mkdirSync(skills, { recursive: true });
    writeFileSync(path.join(skills, "ci-empty.md"), [
      "---",
      "name: ci-empty",
      "description: what to do when a job runs nothing",
      "when: A behave run reports 0 scenarios, or work touches .github/workflows/e2e.yml",
      "---",
      "",
      "# Skill — ci-empty",
      "",
    ].join("\n"));
    const payload = JSON.parse(run(dir, ["validate", "--json"]).stdout);
    assert.ok(!payload.warnings.some((w) => /no detectable trigger/.test(w)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
