// @ts-check
import path from "node:path";
import process from "node:process";
import { exists } from "../lib/fs-ops.js";
import { c } from "../lib/colors.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";
import { collectSnapshot } from "../lib/snapshot.js";
import { renderView } from "../lib/views.js";
import { contextRouting, workspaceActions, workspaceFindings, workspaceHandoff, workspaceRootAt, workspaceSnapshot, workspaceStatus } from "../lib/workspace-view.js";
import { today } from "../lib/dates.js";

// Session handoff note: everything the NEXT session (a fresh agent, a
// teammate, tomorrow's you) needs to resume without re-reading the tree —
// where the open work stands task-by-task, which gates are red, and the
// exact command to continue with. Doctrina's thesis is that context must
// survive across sessions; this command is that thesis for the in-flight
// change. It is a VIEW derived from the tree at call time, deliberately not
// a stored file: a saved note goes stale the moment work continues, the
// tree never does (no new home for facts).
//
// Since change 0037 that word "view" is literal: the note is rendered by
// lib/views.js from the one snapshot lib/snapshot.js collects, and is equally
// reachable as `doctrina status --view handoff`.

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json"], string: [] };

export async function run(_positional, _flags) {
  const projectRoot = process.cwd();
  const wsRoot = workspaceRootAt(projectRoot);
  if (!wsRoot && !exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }
  // At a workspace root: the planner's resume note — projects, open
  // deliveries and their changes, the next actions (change 0230).
  const lines = wsRoot ? workspaceHandoff(workspaceSnapshot(wsRoot), today()) : renderView("handoff", collectSnapshot(projectRoot));
  for (const line of lines) console.log(line);
  if (process.stdout.isTTY) {
    console.log("");
    console.log(c.gray("tip: pipe it — `doctrina handoff > note.md` — or paste it as the first message of the next session"));
  }
  return 0;
}

export const help = `
Usage: doctrina handoff

Print a session handoff note in Markdown: gate digest, each open change
with its task-by-task progress and the exact resume command, and the
prioritised next actions. Made to be pasted as the first message of the
next agent session (or piped to a file).

At a workspace root it is the planner's note instead: projects and
their state, open deliveries with each repository's changes, next actions.

The same view as \`doctrina status --view handoff\`; both render one
collection of the tree.

Deliberately a derived view, not a stored file — the tree is the truth
and never goes stale; regenerate on demand. Read-only; always exits 0.
`;
