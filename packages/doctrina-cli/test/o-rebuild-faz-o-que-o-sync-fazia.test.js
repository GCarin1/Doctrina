// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// THE REBUILD IS THE ONE RECONCILIATION: `skill sync` WAS A SUBSET OF IT.
//
// `index rebuild` already registered every skill and mirrored its
// frontmatter description; `skill sync` did the same for skills alone, plus
// one rule of its own (change 0111): a description still in the scaffold's
// `<...>` form never overwrites one somebody wrote. The rebuild now carries
// that rule, so the two leave the same index behind — which is the bar for
// retiring a command here (ADR 0026: redundancy, shown by a test).

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

const skillPath = (dir, id) => path.join(dir, ".doctrina", "skills", `${id}.md`);
const skills = (dir) => JSON.parse(readFileSync(path.join(dir, ".doctrina", "index.json"), "utf8"))
  .artifacts.skills.map(({ id, description }) => ({ id, description }));

function setDescription(dir, id, value) {
  const text = readFileSync(skillPath(dir, id), "utf8");
  writeFileSync(skillPath(dir, id), text.replace(/^description: .*$/m, `description: ${value}`));
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-skill-merge-"));
  assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
  assert.equal(runCli(["skill", "new", "backtest"], dir).status, 0);
  setDescription(dir, "backtest", "Runs the portfolio backtest");
  assert.equal(runCli(["index", "rebuild"], dir).status, 0);
  return dir;
}

// Same start, two copies: one reconciled by `skill sync`, one by the rebuild.
function bothWays(prepare) {
  const a = project();
  const b = mkdtempSync(path.join(os.tmpdir(), "doctrina-skill-merge-"));
  try {
    prepare(a);
    cpSync(a, b, { recursive: true });
    assert.equal(runCli(["skill", "sync"], a).status, 0);
    assert.equal(runCli(["index", "rebuild"], b).status, 0);
    return { sync: skills(a), rebuild: skills(b) };
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
}

test("a description edited after indexing: both mirror the new one", () => {
  const r = bothWays((dir) => setDescription(dir, "backtest", "Runs the backtest and prints the drawdown"));
  assert.deepEqual(r.rebuild, r.sync);
  assert.equal(r.rebuild[0].description, "Runs the backtest and prints the drawdown");
});

test("a written description reverted to the placeholder: both keep the written one", () => {
  const r = bothWays((dir) => setDescription(dir, "backtest", "<one-sentence summary of what this skill helps the agent do>"));
  assert.deepEqual(r.rebuild, r.sync);
  assert.equal(r.rebuild[0].description, "Runs the portfolio backtest");
});

test("a skill written by hand, never indexed: both register it", () => {
  const r = bothWays((dir) => writeFileSync(skillPath(dir, "rebalance"),
    "---\nname: rebalance\ndescription: Rebalances the portfolio to target weights\nwhen: `rebalance` command\n---\n\n# Rebalance\n"));
  assert.deepEqual(r.rebuild, r.sync);
  assert.ok(r.rebuild.some((s) => s.id === "rebalance" && s.description === "Rebalances the portfolio to target weights"));
});

test("skill sync still works, warns on stderr, and names the rebuild", () => {
  const dir = project();
  try {
    const r = runCli(["skill", "sync"], dir);
    assert.equal(r.status, 0);
    assert.match(r.stderr, /deprecated:.*doctrina index rebuild/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
