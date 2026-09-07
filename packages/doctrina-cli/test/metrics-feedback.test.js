import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { readSeries, trend, collectMetrics, REEDIT_WINDOW_DAYS } from "../src/lib/metrics-model.js";

// Change 0050 — the two instruments start feeding a decision.
//
// The metrics snapshots are a time series versioned in the repository, and
// the only thing that read them was a delta against the most recent one: a
// year of measurement answering "better than last time?" (F15). And
// `lib/usage.js` was built to instrument the surface before shrinking it,
// with one reader — a command someone had to think to type — so the decision
// it exists to inform kept being taken on opinion (F16).
//
// Neither becomes a gate here. What these pin is that the data reaches a
// surface a person actually reads, and that the instrument stays off until
// it is asked for.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd, env = {}) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1", ...env },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-metrics-"));
  assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
  return dir;
}

function snapshot(dir, date, values) {
  const metricsDir = path.join(dir, ".doctrina", "metrics");
  mkdirSync(metricsDir, { recursive: true });
  writeFileSync(path.join(metricsDir, `${date}.json`), JSON.stringify({
    generated: date, window: "90 days ago", commits: 100, reverts: 0,
    revert_rate: 0, fix_share: 0, reedit_window_days: REEDIT_WINDOW_DAYS,
    reedit_rate: 0, top_churn: [], ...values,
  }, null, 2));
}

test("the series is read whole, oldest first", () => {
  const dir = project();
  try {
    assert.deepEqual(readSeries(dir), [], "no snapshots is an empty series, not a failure");
    snapshot(dir, "2026-03-01", { revert_rate: 0.10 });
    snapshot(dir, "2026-01-01", { revert_rate: 0.02 });
    snapshot(dir, "2026-02-01", { revert_rate: 0.06 });
    // A file that is not a snapshot, and one that is not JSON: skipped, never
    // fatal — the directory is versioned and people put things in it.
    writeFileSync(path.join(dir, ".doctrina", "metrics", "notes.md"), "hand notes\n");
    writeFileSync(path.join(dir, ".doctrina", "metrics", "2026-04-01.json"), "{ broken");

    const series = readSeries(dir);
    assert.deepEqual(series.map((s) => s.generated), ["2026-01-01", "2026-02-01", "2026-03-01"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the trend spans the whole series, not the last two entries", () => {
  // The failure the delta had: a rate that drifted up for months and dipped
  // once reads as an improvement from the delta and as what it is from the
  // series.
  const dir = project();
  try {
    snapshot(dir, "2026-01-01", { revert_rate: 0.02, fix_share: 0.10, reedit_rate: 0.30 });
    snapshot(dir, "2026-02-01", { revert_rate: 0.09, fix_share: 0.20, reedit_rate: 0.40 });
    snapshot(dir, "2026-03-01", { revert_rate: 0.08, fix_share: 0.25, reedit_rate: 0.45 });

    const t = trend(readSeries(dir));
    assert.equal(t.span, 3);
    assert.deepEqual([t.from, t.to], ["2026-01-01", "2026-03-01"]);
    const revert = t.rows.find((r) => r.rate === "revert_rate");
    assert.equal(revert.first, 0.02);
    assert.equal(revert.last, 0.08);
    assert.ok(revert.delta > 0, "the drift across the span is up, though the last step was down");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--trend prints every snapshot, and says so when there is only one", () => {
  const dir = project();
  try {
    const empty = runCli(["metrics", "--trend"], dir);
    assert.equal(empty.status, 0);
    assert.match(empty.stdout, /no saved snapshots yet/);

    snapshot(dir, "2026-01-01", { revert_rate: 0.02 });
    const one = runCli(["metrics", "--trend"], dir);
    assert.match(one.stdout, /2026-01-01/);
    assert.match(one.stdout, /a trend needs two/);

    snapshot(dir, "2026-02-01", { revert_rate: 0.09 });
    const two = runCli(["metrics", "--trend"], dir);
    assert.match(two.stdout, /2026-01-01/);
    assert.match(two.stdout, /2026-02-01/);
    assert.match(two.stdout, /Across 2 snapshots/);
    assert.match(two.stdout, /revert rate: 2\.0% → 9\.0%/);
    // A direction, never a verdict.
    assert.match(two.stdout, /not a verdict/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("report carries the period's rework rates, from the metrics snapshot", () => {
  const dir = project();
  try {
    const git = (...args) => spawnSync("git", args, { cwd: dir, encoding: "utf8" });
    assert.equal(git("init", "-q").status, 0);
    git("config", "user.email", "t@t");
    git("config", "user.name", "t");
    writeFileSync(path.join(dir, "a.txt"), "one\n");
    git("add", "-A"); git("commit", "-qm", "feat: one");
    writeFileSync(path.join(dir, "a.txt"), "two\n");
    git("add", "-A"); git("commit", "-qm", "fix: two");
    writeFileSync(path.join(dir, "a.txt"), "three\n");
    git("add", "-A"); git("commit", "-qm", 'Revert "fix: two"');

    const snap = collectMetrics(dir, "30 days ago");
    assert.equal(snap.commits, 3);
    assert.equal(snap.reverts, 1);

    const out = runCli(["report", "--since", "30"], dir).stdout;
    assert.match(out, /- reverts: 1 \(33\.3% of commits\)/);
    assert.match(out, new RegExp(`- ${REEDIT_WINDOW_DAYS}-day re-edit rate:`));
    // The same number the metrics command reports for the same window: one
    // definition, so the two surfaces cannot disagree.
    const metrics = runCli(["metrics", "--since", "30"], dir).stdout;
    assert.match(metrics, /reverts                1 \(33\.3%\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("doctor reports never-invoked operations only when the log exists", () => {
  const dir = project();
  try {
    // Off by default: no row, and above all no file.
    const off = runCli(["doctor"], dir);
    assert.doesNotMatch(off.stdout, /usage/);
    assert.ok(!existsSync(path.join(dir, "usage.jsonl")));

    // A named log that does not exist yet is still silence: the row reads,
    // it does not report on an instrument with nothing in it. (The run does
    // append its OWN sample afterwards — that is the instrument the operator
    // switched on doing its job, not the diagnostic writing itself a report.)
    const log = path.join(dir, "usage.jsonl");
    const named = runCli(["doctor"], dir, { DOCTRINA_USAGE_LOG: log });
    assert.doesNotMatch(named.stdout, /never invoked/);
    assert.doesNotMatch(named.stdout, /usage\s+\d+ sample/);
    const written = existsSync(log) ? readFileSync(log, "utf8").trim().split("\n") : [];
    assert.ok(written.every((l) => JSON.parse(l).operation === "doctor"),
      "nothing but the run's own sample may be written");

    // With samples, it names what has never been reached for.
    assert.equal(runCli(["status"], dir, { DOCTRINA_USAGE_LOG: log }).status, 0);
    const on = runCli(["doctor"], dir, { DOCTRINA_USAGE_LOG: log });
    assert.match(on.stdout, /usage\s+\d+ samples?; \d+ of \d+ operations never invoked/);
    assert.match(on.stdout, /never invoked: /);
    // And the row never fails the diagnostic: an unused command is a
    // candidate, not a defect (ADR 0026).
    assert.doesNotMatch(on.stdout, /FAIL\s+usage/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a project with no usage log behaves exactly as before", () => {
  const dir = project();
  try {
    const before = runCli(["doctor"], dir);
    const after = runCli(["doctor"], dir, { DOCTRINA_USAGE_LOG: "" });
    assert.equal(before.stdout, after.stdout);
    assert.equal(before.status, after.status);
    assert.equal(readdirSync(dir).includes("usage.jsonl"), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
