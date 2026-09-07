// @ts-check
import path from "node:path";
import process from "node:process";
import { exists } from "../lib/fs-ops.js";
import { flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";
import { collectSnapshot } from "../lib/snapshot.js";
import { renderView } from "../lib/views.js";
import { gitWindow, windowCutoff } from "../lib/git.js";

// Periodic digest in Markdown — the standup/PR-description view: what was
// archived, where the gates stand, and what local git says about the period.
// Read-only, no network; the git section degrades silently outside a repo.
//
// Since change 0037 it is a VIEW over the shared snapshot (lib/snapshot.js →
// lib/views.js), also reachable as `doctrina status --view report --since N`,
// and its two git probes go through lib/git.js rather than a private
// spawnSync that could read a refusal as an empty answer.

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json"], string: ["since"] };

export async function run(_positional, flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }

  const sinceRaw = flagString(flags, "since") ?? "7";
  const days = Number.parseInt(sinceRaw, 10);
  if (!Number.isFinite(days) || days <= 0) {
    console.error(c.red("error:") + ` --since expects a positive day count, got "${sinceRaw}"`);
    return 2;
  }

  const options = { days, cutoffIso: windowCutoff(days), git: gitWindow(projectRoot, days) };
  for (const line of renderView("report", collectSnapshot(projectRoot), options)) console.log(line);
  return 0;
}

export const help = `
Usage: doctrina report [--since <days>]

Print a Markdown digest for the period (default: last 7 days): gate
state, changes archived in the window (from the index ledger), open
work with task progress, artifact counts, and a local-git summary
(commits, fix share, top-churn files). Made for standups and PR
descriptions. Read-only; no network. \`doctrina metrics\` has the
deeper git-derived numbers.

The same view as \`doctrina status --view report --since <days>\`.
`;
