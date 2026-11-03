// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { computeSnapshot, trend } from "../src/lib/metrics-model.js";

// ADHERENCE TO THE CYCLE IS MEASURED (change 0218).
//
// A field review: the agent knew the framework existed and still went
// straight to code when the request did not name it. Hooks, the contract
// and the lean pack are bets on changing that; this is the number that
// says whether they did — and, from the usage sample, whether a change got
// its read and its close.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

test("the share of code commits that carried a change, ignoring docs and the Doctrina tree", () => {
  const commits = [
    { hash: "a", ts: 1, subject: "feat: login — Change 0012", files: ["src/login.js"] },
    { hash: "b", ts: 2, subject: "feat: logout", files: ["src/logout.js", ".doctrina/changes/0013-logout/proposal.md"] },
    { hash: "c", ts: 3, subject: "fix: typo", files: ["src/util.js"] },
    { hash: "d", ts: 4, subject: "docs: readme", files: ["README.md"] },
    { hash: "e", ts: 5, subject: "chore: index", files: [".doctrina/index.json", ".agents/skills/x/SKILL.md"] },
  ];
  const s = computeSnapshot(commits, "90 days ago");
  assert.equal(s.code_commits, 3, "docs-only and Doctrina-only commits are not code");
  assert.equal(s.change_adherence, 0.667);
  assert.equal(computeSnapshot([commits[3]], "x").change_adherence, null, "no code, no rate");
  const t = trend([{ ...s, generated: "2026-01-01", change_adherence: 0.5 }, { ...s, generated: "2026-02-01" }]);
  assert.deepEqual(t.rows.find((r) => r.rate === "change_adherence"), { rate: "change_adherence", first: 0.5, last: 0.667, delta: 0.167 });
});

test("metrics --commands reads the cycle per work off the usage sample", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-adherence-"));
  try {
    const log = path.join(dir, "usage.jsonl");
    writeFileSync(log, ["work", "work", "context", "close", "close", "prime"].map((op) => JSON.stringify({ operation: op })).join("\n") + "\n");
    const run = spawnSync(process.execPath, [cliEntry, "init", "--non-interactive", "--project-name", "A"], { cwd: dir, encoding: "utf8" });
    assert.equal(run.status, 0);
    const out = spawnSync(process.execPath, [cliEntry, "metrics", "--commands"], {
      cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1", DOCTRINA_USAGE_LOG: log },
    }).stdout;
    assert.match(out, /Workflow — per `work` \(2\)\n {2}context {2}0\.5 {3}close {2}1\.0 {3}prime {2}0\.5/);
    assert.match(out, /fewer reads than changes/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
