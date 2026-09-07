// @ts-check
import path from "node:path";
import process from "node:process";
import { exists } from "../lib/fs-ops.js";
import { flagBool, flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";
import { collectSnapshot } from "../lib/snapshot.js";
import { renderView } from "../lib/views.js";
import { gitWindow, windowCutoff } from "../lib/git.js";
import { draftAgentChangelog, renderDraft } from "../lib/agent-changelog.js";
import { collectMetrics } from "../lib/metrics-model.js";
import { cliVersion } from "../lib/version.js";

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
export const flags = { boolean: ["json", "agent-changelog"], string: ["since"] };

export async function run(_positional, flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }

  const sinceRaw = flagString(flags, "since");
  const days = Number.parseInt(sinceRaw ?? "7", 10);
  if (!Number.isFinite(days) || days <= 0) {
    console.error(c.red("error:") + ` --since expects a positive day count, got "${sinceRaw}"`);
    return 2;
  }

  // --agent-changelog: a DRAFT of the block `upgrade --write` writes into
  // AGENTS.md, proposed from what the archived changes said they touched.
  // A different report for a different audience — five bullets for an
  // arriving agent, not a digest for a standup — so it replaces the view
  // rather than appending to it. Authorship stays human (ADR 0005): the
  // command proposes, a person cuts and rewrites.
  if (flagBool(flags, "agent-changelog", false)) {
    const draft = draftAgentChangelog(projectRoot, { days: sinceRaw === undefined ? null : days });
    for (const line of renderDraft(draft, cliVersion())) console.log(line);
    return 0;
  }

  const options = {
    days,
    cutoffIso: windowCutoff(days),
    git: gitWindow(projectRoot, days),
    // The same snapshot `metrics` renders, for the same window (change
    // 0050). One definition of "revert rate", so the digest and the metrics
    // command cannot report two different numbers for one period.
    metrics: collectMetrics(projectRoot, `${days} days ago`),
  };
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

  --agent-changelog   Draft the AGENTS.md "What changed" block instead of
                      the digest: one candidate bullet per archived change
                      that touched a documented surface (a command, a flag,
                      an exit code), newest first, capped at the block's
                      five bullets. The window is "since the last tag"
                      unless --since names one. It PROPOSES; a person cuts
                      and rewrites, because what an agent must do
                      differently is a judgement the CLI does not make.
`;
