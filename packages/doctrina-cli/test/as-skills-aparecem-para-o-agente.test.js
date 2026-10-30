// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { renderSkillExport, EXPORT_MARK } from "../src/lib/skill-export.js";

// THE PROJECT'S SKILLS ARE WHERE THE AGENT LOOKS FOR SKILLS (change 0212).
//
// A field review of an agent in Cursor: its skill catalogue never listed
// `.doctrina/skills/`, so a matching skill fired only when the request named
// its file. Cursor and Codex discover `.agents/skills/<name>/SKILL.md`,
// Claude Code `.claude/skills/`; the exports are generated from the one
// source and marked as generated.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

const SKILL = `---
name: backtest-a-strategy
description: Backtest a trading strategy against stored quotes.
when: The task changes a strategy or its parameters.
---

# Skill — backtest-a-strategy

Run the backtest before the change, and after.
`;

test("a skill becomes a SKILL.md whose description carries its trigger", () => {
  const out = renderSkillExport("backtest-a-strategy", SKILL.replace(/\n/g, "\r\n"));
  assert.match(out, /^---\nname: backtest-a-strategy\ndescription: "Backtest a trading strategy against stored quotes\. Use when: The task changes a strategy or its parameters\."\n---\n/);
  assert.ok(out.includes(EXPORT_MARK), "marked as generated");
  assert.match(out, /# Skill — backtest-a-strategy\n\nRun the backtest/);
  assert.doesNotMatch(out, /\r/);
});

test("index rebuild exports to .agents/skills, and to .claude/skills once the claude adapter is in", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-skill-export-"));
  const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
  try {
    assert.equal(run(["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
    writeFileSync(path.join(dir, ".doctrina", "skills", "backtest-a-strategy.md"), SKILL);
    const check = run(["index", "rebuild", "--check"]);
    assert.match(check.stdout, /skill export is out of date/);
    assert.ok(!existsSync(path.join(dir, ".agents")), "--check writes nothing");

    run(["index", "rebuild"]);
    const agents = path.join(dir, ".agents", "skills", "backtest-a-strategy", "SKILL.md");
    assert.match(readFileSync(agents, "utf8"), /name: backtest-a-strategy/);
    assert.ok(!existsSync(path.join(dir, ".claude", "skills")), "no claude adapter, no claude export");

    assert.match(run(["adapter", "add", "claude"]).stdout, /export\s+1 skill file/);
    assert.ok(existsSync(path.join(dir, ".claude", "skills", "backtest-a-strategy", "SKILL.md")));

    // A folder the user put there is theirs; a generated one goes with its source.
    mkdirSync(path.join(dir, ".agents", "skills", "mine"), { recursive: true });
    writeFileSync(path.join(dir, ".agents", "skills", "mine", "SKILL.md"), "---\nname: mine\ndescription: x\n---\n");
    rmSync(path.join(dir, ".doctrina", "skills", "backtest-a-strategy.md"));
    run(["index", "rebuild"]);
    assert.ok(!existsSync(path.join(dir, ".agents", "skills", "backtest-a-strategy")));
    assert.ok(existsSync(path.join(dir, ".agents", "skills", "mine", "SKILL.md")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
