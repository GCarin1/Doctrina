// @ts-check
import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read, relPath, write } from "../lib/fs-ops.js";
import { today } from "../lib/dates.js";
import { flagBool, flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { EXIT } from "../lib/exit-codes.js";
import { GIT_STATE, historyState, git } from "../lib/git.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";
import { USAGE_ENV, summarise } from "../lib/usage.js";
import { OPERATIONS } from "../lib/commands.js";
import { REEDIT_WINDOW_DAYS, computeSnapshot, parseLog, readSeries, latestSnapshot, trend, round } from "../lib/metrics-model.js";

// Local-only adoption metrics derived from git history. No network calls,
// no telemetry: the numbers stay in the repository, versioned like any
// other artifact. This is the tooling half of docs/en/validation.md.

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json", "save", "commands", "trend"], string: ["since"] };

export async function run(_positional, flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }
  // --commands reads the usage log rather than git history: which parts of
  // the command surface are actually reached for (M8). Separate report,
  // separate source, so it never dilutes the adoption metrics.
  if (flagBool(flags, "commands", false)) return commandUsage();
  // --trend reads the SERIES of saved snapshots rather than git. The
  // snapshots are a time series versioned in the repository, and for two
  // releases the only thing that read them was a delta against the most
  // recent one (audit finding F15) — a year of measurement answering one
  // question. Reading the series is what makes the saving worth doing.
  if (flagBool(flags, "trend", false)) return printTrend(projectRoot);
  const probe = git(projectRoot, ["rev-parse", "--is-inside-work-tree"]);
  // "No history yet" is a VALID state, not a failure — a brand-new project
  // is the most common state in which someone explores this command, and it
  // used to answer with a raw git plumbing error (C8). git missing entirely
  // is the one genuine ENVIRONMENT condition here.
  const history = historyState(projectRoot);
  if (!history.usable) {
    if (history.state === GIT_STATE.ABSENT) {
      console.error(c.red("error:") + ` ${history.reason} — metrics are derived from local git history`);
      return EXIT.ENVIRONMENT;
    }
    console.log(c.bold("Doctrina metrics") + c.gray(" (local git history)"));
    console.log("");
    console.log(c.gray(`no history to measure yet — ${history.reason}.`));
    console.log(c.gray("Commit some work and run this again."));
    return EXIT.OK;
  }

  const sinceRaw = flagString(flags, "since", "90");
  const since = /^\d+$/.test(sinceRaw) ? `${sinceRaw} days ago` : sinceRaw;
  const save = flagBool(flags, "save", false);

  const log = git(projectRoot, [
    "log", `--since=${since}`, "--date=unix",
    "--pretty=format:@@%H|%ct|%s", "--name-only",
  ]);
  if (log.state !== GIT_STATE.OK) {
    console.error(c.red("error:") + ` git log failed: ${log.stderr.trim()}`);
    return EXIT.ENVIRONMENT;
  }

  const commits = parseLog(log.stdout);
  console.log(c.bold("Doctrina metrics") + c.gray(` (local git history, window: ${since})`));
  console.log("");
  if (commits.length === 0) {
    console.log(c.gray("no commits in the window; nothing to measure"));
    return 0;
  }

  const snapshot = computeSnapshot(commits, since);
  printReport(snapshot);

  if (save) {
    const dir = path.join(projectRoot, ".doctrina", "metrics");
    const file = path.join(dir, `${today()}.json`);
    const previous = latestSnapshot(projectRoot, path.basename(file));
    write(file, JSON.stringify(snapshot, null, 2) + "\n", { force: true });
    console.log("");
    console.log(c.green("saved") + ` ${relPath(projectRoot, file)}`);
    if (previous) {
      console.log("");
      console.log(c.bold("Δ vs " + previous.generated + ":"));
      printDelta("revert rate", previous.revert_rate, snapshot.revert_rate);
      printDelta("fix share", previous.fix_share, snapshot.fix_share);
      printDelta(`${REEDIT_WINDOW_DAYS}-day re-edit rate`, previous.reedit_rate, snapshot.reedit_rate);
    }
  }
  return 0;
}

// The saved series, oldest first, with the direction each rate moved across
// the whole span. No verdict attached: a revert rate moves with team size,
// release cadence and how the window was drawn, and the CLI cannot tell an
// improvement from a quieter quarter.
function printTrend(projectRoot) {
  const series = readSeries(projectRoot);
  console.log(c.bold("Doctrina metrics") + c.gray(" — saved snapshots (.doctrina/metrics/)"));
  console.log("");
  if (series.length === 0) {
    console.log(c.gray("no saved snapshots yet — `doctrina metrics --save` writes the first."));
    return 0;
  }
  console.log(c.gray("date          commits  reverts  fix share  re-edit"));
  for (const snap of series) {
    console.log(
      `${String(snap.generated).padEnd(12)}  ${String(snap.commits ?? "—").padStart(7)}  ` +
      `${pct(snap.revert_rate).padStart(7)}  ${pct(snap.fix_share).padStart(9)}  ${pct(snap.reedit_rate).padStart(7)}`,
    );
  }
  const t = trend(series);
  if (t.rows.length === 0) {
    console.log("");
    console.log(c.gray(`one snapshot — a trend needs two. Save another with \`doctrina metrics --save\`.`));
    return 0;
  }
  console.log("");
  console.log(c.bold(`Across ${t.span} snapshots (${t.from} → ${t.to}):`));
  for (const row of t.rows) printDelta(LABELS[row.rate] ?? row.rate, row.first, row.last);
  console.log("");
  console.log(c.gray("A direction, not a verdict: these rates move with team size and cadence."));
  return 0;
}

const LABELS = {
  revert_rate: "revert rate",
  fix_share: "fix share",
  reedit_rate: `${REEDIT_WINDOW_DAYS}-day re-edit rate`,
};

function printReport(s) {
  console.log(`commits                ${s.commits}`);
  console.log(`reverts                ${s.reverts} (${pct(s.revert_rate)})`);
  console.log(`fix-typed commits      ${pct(s.fix_share)} of commits (Conventional Commits "fix")`);
  console.log(`${s.reedit_window_days}-day re-edit rate     ${pct(s.reedit_rate)} of commits touch a file edited in the prior ${s.reedit_window_days} days`);
  console.log(c.gray("                       (proxy for rework — iterative work also counts)"));
  if (s.top_churn.length > 0) {
    console.log("");
    console.log("top churn:");
    for (const t of s.top_churn) {
      console.log(`  ${String(t.commits).padStart(4)}  ${t.file}`);
    }
  }
}

function printDelta(label, before, after) {
  if (before === undefined || after === undefined) return;
  const diff = after - before;
  const arrow = diff > 0 ? c.red(`+${pct(diff)}`) : diff < 0 ? c.green(pct(diff)) : c.gray("±0");
  console.log(`  ${label}: ${pct(before)} → ${pct(after)} (${arrow})`);
}


function pct(x) {
  if (typeof x !== "number") return "—";
  return `${(x * 100).toFixed(1)}%`;
}

// Which operations were actually invoked, from the opt-in usage log. The
// surface is 36 commands and 59 operations; the audit's charge is that some
// exist because they were easy to add rather than because anyone reaches for
// them. This is the evidence for that argument — or against it. Zero samples
// is a CANDIDATE for cutting, never a verdict: a command used once a quarter
// and a command nobody wants look identical over one week.
function commandUsage() {
  const target = process.env[USAGE_ENV];
  if (!target) {
    console.log(c.bold("Command usage") + c.gray(" — not recording"));
    console.log("");
    console.log(c.gray("Instrumentation is off unless you ask for it. To start a sample:"));
    console.log("  " + c.cyan(`export ${USAGE_ENV}=$PWD/.doctrina/usage.jsonl`));
    console.log("");
    console.log(c.gray("One local append-only file. The operation only — never arguments,"));
    console.log(c.gray("paths, ids or prompts. No network calls, here or anywhere in the CLI."));
    console.log(c.gray("Run three real changes through it, then come back."));
    return 0;
  }
  if (!isFile(target)) {
    console.log(c.bold("Command usage") + c.gray(` — ${USAGE_ENV} set, no samples yet`));
    return 0;
  }
  const catalog = OPERATIONS.map((o) => o[0]);
  const { samples, used, unused } = summarise(read(target), catalog);
  console.log(c.bold("Command usage") + c.gray(` — ${samples} invocation${samples === 1 ? "" : "s"} recorded`));
  console.log("");
  for (const [op, n] of used) {
    console.log(`  ${String(n).padStart(5)}  ${c.cyan(op)}`);
  }
  console.log("");
  console.log(c.gray(`${unused.length} of ${catalog.length} operations never invoked in this sample:`));
  for (let i = 0; i < unused.length; i += 4) {
    console.log("  " + c.gray(unused.slice(i, i + 4).map((o) => o.padEnd(22)).join("")));
  }
  console.log("");
  console.log(c.gray("Never-invoked is a question, not an answer. Before cutting one, ask"));
  console.log(c.gray("whether it went unused because nobody wants it or because nobody"));
  console.log(c.gray("could find it — the second is what AGENTS.md discovery fixed in 0.13."));
  return 0;
}

export const help = `
Usage: doctrina metrics [--since <days|date>] [--save] [--commands]

Derive adoption metrics from LOCAL git history: commit count, revert
count and rate, Conventional-Commit fix share, top-churn files, and a
${REEDIT_WINDOW_DAYS}-day re-edit proxy rate. No network calls; nothing leaves the repo.

Flags:
  --commands         Report which operations were actually invoked, from the
                     opt-in usage log. Recording is OFF unless DOCTRINA_USAGE_LOG
                     names a file; only the operation is recorded, never
                     arguments, and nothing leaves the machine.
  --since <n|date>   Window: a day count (default 90) or any git-parseable
                     date ("2026-01-01", "3 months ago").
  --save             Write .doctrina/metrics/YYYY-MM-DD.json and print the
                     deltas against the most recent prior snapshot.
  --trend            Read the saved snapshots instead of git: every snapshot
                     in date order, and the direction each rate moved across
                     the whole span (first to last, not last to previous).

This is the tooling half of the empirical A/B protocol in
docs/en/validation.md: snapshot before adopting Doctrina, snapshot each
month after, compare.
`;
