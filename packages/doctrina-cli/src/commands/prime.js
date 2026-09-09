// @ts-check
import path from "node:path";
import process from "node:process";
import { exists } from "../lib/fs-ops.js";
import { flagBool } from "../lib/args.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";
import { collectSnapshot } from "../lib/snapshot.js";
import { renderView } from "../lib/views.js";

// Session primer: the ~40-line read that orients an agent at the start of a
// session — where things stand, what the standing rules are, what work is
// open, and what to do next — without paying for the full context pack.
// It sits between `status` (numbers only) and `context --concat` (everything):
// enough to act, cheap enough to run every session. Strictly read-only; every
// line is assembled from artifacts that already own the fact (no new home).
//
// Since change 0037 the primer is a VIEW over lib/snapshot.js, rendered by
// lib/views.js and reachable as `doctrina status --view prime`. This module
// is the name AGENTS.md tells agents to run, and nothing else: no collection,
// no formatting, and nothing for another command to import out of.

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json", "rules"], string: [] };

export async function run(_positional, flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }
  // --rules: the standing rules in full, which is what `constitution` printed
  // (change 0049). The primer names the ADRs and counts the non-goals; this
  // prints both lists, from the same collection, so the two cannot disagree.
  const view = flagBool(flags, "rules", false) ? "rules" : "prime";
  for (const line of renderView(view, collectSnapshot(projectRoot))) console.log(line);
  return 0;
}

export const help = `
Usage: doctrina prime

Print the session primer: gate digest, standing rules (accepted ADR
titles + non-goal count), open work with task progress, and the top
next actions — the ~40-line read that orients an agent at session
start without paying for the full context pack.

The same view as \`doctrina status --view prime\`; both render one
collection of the tree, so they cannot disagree.

  --rules   Print the standing rules in full instead of the primer: every
            accepted ADR and every declared non-goal. The same lines
            \`doctrina constitution\` printed, from the same collection —
            that command is deprecated and delegates here.

Read-only; always exits 0. Deeper reads: \`doctrina context\`,
\`doctrina why <cap>\`, \`doctrina show <ref>\`.
`;
