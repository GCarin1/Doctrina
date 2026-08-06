import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read } from "../lib/fs-ops.js";
import { listHeader } from "../lib/scan.js";
import { collectStatus } from "./status.js";
import { computeActions } from "./next.js";
import { acceptedDecisions, productSection } from "./constitution.js";
import { c } from "../lib/colors.js";

// Session primer: the ~40-line read that orients an agent at the start of a
// session — where things stand, what the standing rules are, what work is
// open, and what to do next — without paying for the full context pack.
// It sits between `status` (numbers only) and `context --concat` (everything):
// enough to act, cheap enough to run every session. Strictly read-only; every
// line is assembled from artifacts that already own the fact (no new home).

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: [], string: [] };

export async function run(_positional, _flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }

  const s = collectStatus(projectRoot);

  console.log(c.bold("Doctrina prime") + c.gray(` — ${s.project}  (framework ${s.stamp ?? "—"} / CLI ${s.cli})`));
  console.log("");

  // One-line gate digest.
  const cov = `${s.coverage.pct}% (${s.coverage.totalCovered}/${s.coverage.totalCriteria})`;
  const tr = s.trace.anchors === 0 ? "no anchors" : `${s.trace.realized}/${s.trace.anchors}`;
  const verify = s.verify.configured ? `${s.verify.checks} verify checks` : "verify not configured";
  console.log(c.bold("Gates  ") + `index ${s.indexState} · coverage ${cov} · trace ${tr} · ${verify}`);
  const implBreak = Object.entries(s.specs.impl).map(([k, v]) => `${v} ${k}`).join(", ");
  console.log(
    c.bold("Work   ") +
      `${s.specs.total} specs${implBreak ? ` (${implBreak})` : ""} · ${s.specs.openChanges} open change${s.specs.openChanges === 1 ? "" : "s"} · ` +
      `${s.decisions.total} decisions · ${s.skills} skills`,
  );

  // Standing rules, titles only — `constitution` has the full text.
  const adrs = acceptedDecisions(projectRoot);
  console.log("");
  console.log(c.bold("Rules") + c.gray(`  (${adrs.length} accepted ADRs — \`doctrina constitution\` for detail)`));
  for (const a of adrs) console.log(`  ${c.cyan(a.id)}  ${a.title}`);
  const nonGoals = productSection(projectRoot, "Non-goals");
  if (nonGoals.length > 0) {
    console.log(c.gray(`  + ${nonGoals.length} non-goal${nonGoals.length === 1 ? "" : "s"} declared in product.md`));
  }

  // Open work, with unchecked-task counts — the resume points.
  console.log("");
  console.log(c.bold("Open work"));
  const open = openChanges(projectRoot);
  if (open.length === 0) {
    console.log(c.gray("  none — `doctrina work \"<prompt>\"` opens the next change"));
  } else {
    for (const ch of open) {
      const tasks = ch.tasksTotal > 0 ? ` · tasks ${ch.tasksDone}/${ch.tasksTotal}` : "";
      console.log(`  ${c.cyan(ch.id)}  ${ch.title ?? ""}${c.gray(` (${ch.status}${tasks})`)}`);
    }
  }

  // Next actions (top 5 — `doctrina next` for the full list).
  const actions = computeActions(projectRoot);
  console.log("");
  console.log(c.bold("Next"));
  if (actions.length === 0) {
    console.log(c.gray("  nothing pending — pick up new work"));
  } else {
    actions.slice(0, 5).forEach((a, i) => console.log(`  ${i + 1}. ${a}`));
    if (actions.length > 5) console.log(c.gray(`  … ${actions.length - 5} more — \`doctrina next\``));
  }

  console.log("");
  console.log(c.gray("Read deeper: `doctrina context [<cap>] --concat` · `doctrina why <cap>` · `doctrina show <ref>`"));
  return 0;
}

// Open changes with their proposal status/title and task progress.
export function openChanges(projectRoot) {
  const changesDir = path.join(projectRoot, ".doctrina", "changes");
  const out = [];
  if (!isDir(changesDir)) return out;
  for (const id of readdirSync(changesDir).sort()) {
    if (id === "archive" || id.startsWith(".")) continue;
    if (!isDir(path.join(changesDir, id))) continue;
    const proposalPath = path.join(changesDir, id, "proposal.md");
    const proposal = isFile(proposalPath) ? read(proposalPath) : null;
    const title = proposal?.match(/^#\s+(?:Change\s+[^—-]*[—-]\s*)?(.+)$/m)?.[1]?.trim() ?? null;
    const status = proposal ? (listHeader(proposal, "Status") ?? "proposed") : "no proposal.md";
    const tasksPath = path.join(changesDir, id, "tasks.md");
    let tasksDone = 0, tasksTotal = 0, unchecked = [];
    if (isFile(tasksPath)) {
      for (const line of read(tasksPath).split(/\r?\n/)) {
        const m = line.match(/^-\s+\[([ xX])\]\s+(.*)$/);
        if (!m) continue;
        tasksTotal += 1;
        if (m[1] === " ") unchecked.push(m[2].trim());
        else tasksDone += 1;
      }
    }
    out.push({ id, title, status, tasksDone, tasksTotal, unchecked });
  }
  return out;
}

export const help = `
Usage: doctrina prime

Print the session primer: gate digest, standing rules (accepted ADR
titles + non-goal count), open work with task progress, and the top
next actions — the ~40-line read that orients an agent at session
start without paying for the full context pack.

Read-only; always exits 0. Deeper reads: \`doctrina context\`,
\`doctrina why <cap>\`, \`doctrina show <ref>\`.
`;
