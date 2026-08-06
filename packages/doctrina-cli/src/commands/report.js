import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { exists } from "../lib/fs-ops.js";
import * as idx from "../lib/index-json.js";
import { collectStatus } from "./status.js";
import { openChanges } from "./prime.js";
import { flagString } from "../lib/args.js";
import { today } from "../lib/dates.js";
import { c } from "../lib/colors.js";

// Periodic digest in Markdown — the standup/PR-description view: what was
// archived, where the gates stand, and what local git says about the period.
// Read-only, no network; the git section degrades silently outside a repo.

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: [], string: ["since"] };

export async function run(_positional, flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }

  const sinceRaw = flagString(flags, "since") ?? "7";
  const days = Number.parseInt(sinceRaw, 10);
  if (!Number.isFinite(days) || days <= 0) {
    console.error(c.red("error:") + ` --since expects a positive day count, got "${sinceRaw}"`);
    return 2;
  }
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  const s = collectStatus(projectRoot);

  console.log(`# Doctrina report — ${s.project} (${cutoffIso} → ${today()})`);
  console.log("");

  // Gates.
  console.log("## Gates");
  console.log("");
  console.log(`- index: ${s.indexState} · framework stamp: ${s.stamp ?? "—"} (CLI ${s.cli})`);
  console.log(`- coverage: ${s.coverage.pct}% (${s.coverage.totalCovered}/${s.coverage.totalCriteria} criteria)` +
    (s.coverage.totalDangling ? ` — ${s.coverage.totalDangling} dangling` : "") +
    (s.coverage.totalConditional ? ` — ${s.coverage.totalConditional} conditional` : ""));
  console.log(`- trace: ${s.trace.anchors === 0 ? "no anchors declared" : `${s.trace.realized}/${s.trace.anchors} anchors realized`}`);
  console.log(`- verify: ${s.verify.configured ? `${s.verify.checks} checks declared` : "not configured"}`);

  // Work shipped in the window (from the index ledger) + work in flight.
  console.log("");
  console.log("## Changes");
  console.log("");
  const archived = archivedSince(projectRoot, cutoffIso);
  if (archived.length === 0) {
    console.log(`- archived in period: none`);
  } else {
    console.log(`- archived in period: ${archived.length}`);
    for (const ch of archived) console.log(`  - ${ch.applied} — \`${ch.id}\` ${ch.title}`);
  }
  const open = openChanges(projectRoot);
  if (open.length === 0) {
    console.log("- open now: none");
  } else {
    console.log(`- open now: ${open.length}`);
    for (const ch of open) {
      const tasks = ch.tasksTotal > 0 ? ` (tasks ${ch.tasksDone}/${ch.tasksTotal})` : "";
      console.log(`  - \`${ch.id}\`${ch.title ? ` ${ch.title}` : ""}${tasks}`);
    }
  }

  // Artifact counts, for trend-watching between reports.
  console.log("");
  console.log("## Artifacts");
  console.log("");
  console.log(`- specs: ${s.specs.total} · decisions: ${s.decisions.total}` +
    (s.decisions.proposed ? ` (${s.decisions.proposed} proposed)` : "") +
    ` · skills: ${s.skills}`);

  // Local git window — commits, fix share, top churn. No network.
  console.log("");
  console.log("## Git (local, last " + days + " days)");
  console.log("");
  const git = gitWindow(projectRoot, days);
  if (!git) {
    console.log("- no git history available (not a repository, or git not installed)");
  } else {
    console.log(`- commits: ${git.commits} (${git.fixes} fix-shaped, ${git.commits ? Math.round((git.fixes / git.commits) * 100) : 0}%)`);
    if (git.churn.length > 0) {
      console.log(`- top-churn files:`);
      for (const [file, n] of git.churn) console.log(`  - ${file} (${n} touches)`);
    }
  }

  console.log("");
  console.log(`*Generated read-only by \`doctrina report --since ${days}\`; deeper numbers: \`doctrina metrics\`.*`);
  return 0;
}

function archivedSince(projectRoot, cutoffIso) {
  let index;
  try {
    index = idx.load(projectRoot);
  } catch {
    return [];
  }
  return (index.artifacts?.changes_archive ?? [])
    .filter((ch) => typeof ch.applied === "string" && ch.applied >= cutoffIso)
    .sort((a, b) => String(a.applied).localeCompare(String(b.applied)));
}

function gitWindow(projectRoot, days) {
  const log = spawnSync("git", ["log", `--since=${days} days ago`, "--pretty=%s"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  if (log.status !== 0) return null;
  const subjects = log.stdout.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const fixes = subjects.filter((sub) => /^(fix|bug|hotfix|patch)(\(|:|!)/i.test(sub)).length;

  const files = spawnSync("git", ["log", `--since=${days} days ago`, "--name-only", "--pretty=format:"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  const counts = new Map();
  if (files.status === 0) {
    for (const line of files.stdout.split(/\r?\n/)) {
      const f = line.trim();
      if (!f) continue;
      counts.set(f, (counts.get(f) ?? 0) + 1);
    }
  }
  const churn = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  return { commits: subjects.length, fixes, churn };
}

export const help = `
Usage: doctrina report [--since <days>]

Print a Markdown digest for the period (default: last 7 days): gate
state, changes archived in the window (from the index ledger), open
work with task progress, artifact counts, and a local-git summary
(commits, fix share, top-churn files). Made for standups and PR
descriptions. Read-only; no network. \`doctrina metrics\` has the
deeper git-derived numbers.
`;
