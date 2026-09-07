// @ts-check
// The adoption metrics themselves: what a snapshot IS, computed once.
//
// `metrics` renders a snapshot and saves it; `report` shows two of its rates
// for the reporting period. Before this they would each have had their own
// idea of "revert rate", which is the kind of divergence nobody notices until
// two numbers on two screens disagree and neither is wrong (ADR 0025).
//
// Everything here is derived from local git history. No network calls, no
// telemetry: the numbers stay in the repository, versioned like any other
// artifact. This is the tooling half of docs/en/validation.md.
import path from "node:path";
import { readdirSync } from "node:fs";
import { isDir, isFile, read } from "./fs-ops.js";
import { today } from "./dates.js";
import { GIT_STATE, git } from "./git.js";

export const REEDIT_WINDOW_DAYS = 21;
export const METRICS_REL = ".doctrina/metrics";

export function computeSnapshot(commits, since) {
  const total = commits.length;
  const reverts = commits.filter((cm) => /^Revert\b/.test(cm.subject)).length;
  const fixes = commits.filter((cm) => /^fix[(:!]/.test(cm.subject)).length;

  // File churn: commits per file, top offenders first.
  const churn = new Map();
  for (const cm of commits) {
    for (const f of cm.files) churn.set(f, (churn.get(f) ?? 0) + 1);
  }
  const topChurn = [...churn.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([file, count]) => ({ file, commits: count }));

  // Re-edit proxy: a commit counts when it touches a file another commit
  // already touched in the previous REEDIT_WINDOW_DAYS. This is a proxy
  // for rework, not a verdict — iterative work also trips it.
  const windowSec = REEDIT_WINDOW_DAYS * 86400;
  const lastTouch = new Map();
  let reedits = 0;
  for (const cm of [...commits].sort((a, b) => a.ts - b.ts)) {
    const isReedit = cm.files.some((f) => {
      const prev = lastTouch.get(f);
      return prev !== undefined && cm.ts - prev <= windowSec;
    });
    if (isReedit) reedits += 1;
    for (const f of cm.files) lastTouch.set(f, cm.ts);
  }

  return {
    generated: today(),
    window: since,
    commits: total,
    reverts,
    revert_rate: round(reverts / total),
    fix_share: round(fixes / total),
    reedit_window_days: REEDIT_WINDOW_DAYS,
    reedit_rate: round(reedits / total),
    top_churn: topChurn,
  };
}


export function parseLog(stdout) {
  const commits = [];
  let current = null;
  for (const line of stdout.split("\n")) {
    if (line.startsWith("@@")) {
      const [hash, ts, ...rest] = line.slice(2).split("|");
      current = { hash, ts: Number(ts), subject: rest.join("|"), files: [] };
      commits.push(current);
    } else if (line.trim() !== "" && current) {
      current.files.push(line.trim());
    }
  }
  return commits;
}


export function round(x) {
  return Math.round(x * 1000) / 1000;
}


/**
 * A snapshot for a window, or null when there is no history to read.
 *
 * @param {string} projectRoot
 * @param {string} since  a git --since value ("90 days ago", "2026-01-01")
 */
export function collectMetrics(projectRoot, since) {
  const log = git(projectRoot, [
    "log", `--since=${since}`, "--date=unix",
    "--pretty=format:@@%H|%ct|%s", "--name-only",
  ]);
  if (log.state !== GIT_STATE.OK) return null;
  const commits = parseLog(log.stdout);
  if (commits.length === 0) return null;
  return computeSnapshot(commits, since);
}

/**
 * Every saved snapshot, oldest first.
 *
 * The snapshots are a TIME SERIES, versioned in the repository — and for two
 * releases the only thing that ever read them was a delta against the most
 * recent one, so a year of measurement answered exactly one question: "is it
 * better than last time?" (audit finding F15). Reading the series is what
 * makes the saving worth doing.
 */
export function readSeries(projectRoot) {
  const dir = path.join(projectRoot, ".doctrina", "metrics");
  if (!isDir(dir)) return [];
  const out = [];
  for (const f of readdirSync(dir).sort()) {
    if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(f)) continue;
    const file = path.join(dir, f);
    if (!isFile(file)) continue;
    try {
      const snap = JSON.parse(read(file));
      // The filename is the authority on when it was taken: `generated` can
      // be absent in a hand-edited file, and a series ordered by a field
      // that may be missing is not ordered at all.
      out.push({ ...snap, generated: snap.generated ?? f.replace(/\.json$/, "") });
    } catch { /* a malformed snapshot is skipped, never fatal */ }
  }
  return out;
}

/** The most recent saved snapshot, excluding one basename. */
export function latestSnapshot(projectRoot, excludeBase = null) {
  const series = readSeries(projectRoot).filter((s) => `${s.generated}.json` !== excludeBase);
  return series.length > 0 ? series[series.length - 1] : null;
}

/**
 * The direction each tracked rate moved across the WHOLE series.
 *
 * First to last, not last to previous: a rate that drifted up for six months
 * and dipped once looks like an improvement from the delta and like what it
 * is from the series.
 *
 * @param {ReturnType<typeof readSeries>} series
 */
export function trend(series) {
  const rates = ["revert_rate", "fix_share", "reedit_rate"];
  if (series.length < 2) return { span: series.length, rows: [] };
  const first = series[0];
  const last = series[series.length - 1];
  const rows = [];
  for (const rate of rates) {
    const a = first[rate];
    const b = last[rate];
    if (typeof a !== "number" || typeof b !== "number") continue;
    rows.push({ rate, first: a, last: b, delta: round(b - a) });
  }
  return { span: series.length, from: first.generated, to: last.generated, rows };
}
