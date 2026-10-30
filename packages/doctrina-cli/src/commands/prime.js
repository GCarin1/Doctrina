// @ts-check
import path from "node:path";
import process from "node:process";
import { exists } from "../lib/fs-ops.js";
import { flagBool, flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { EXIT, notADoctrinaProject } from "../lib/exit-codes.js";
import { collectSnapshot, openChanges } from "../lib/snapshot.js";
import { renderView, pulse } from "../lib/views.js";

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
export const flags = { boolean: ["json", "rules", "pulse"], string: ["hook"] };

// What an agent hook accepts on stdout (change 0211). Claude Code adds the
// plain text of a SessionStart hook to the conversation; Cursor's
// sessionStart reads `additional_context` from a JSON object. Both cap what
// they keep — Claude at 10,000 characters — so the primer is cut short of
// that rather than replaced by a file path the agent is never asked to read.
const HOOK_AGENTS = ["claude", "cursor"];
const HOOK_MAX_CHARS = 9000;

export async function run(_positional, flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }
  // --rules: the standing rules in full, which is what the removed
  // `constitution` printed (changes 0049, 0175). The primer names the ADRs and counts the non-goals; this
  // prints both lists, from the same collection, so the two cannot disagree.
  // --pulse: one line for a per-prompt hook — the open changes only, read
  // without collecting the gates, because it runs before every prompt.
  if (flagBool(flags, "pulse", false)) {
    for (const line of pulse(openChanges(projectRoot))) console.log(line);
    return 0;
  }
  if (flags.has("hook")) {
    const agent = flagString(flags, "hook");
    if (!agent || !HOOK_AGENTS.includes(agent)) {
      console.error(c.red("error:") + ` --hook needs one of ${HOOK_AGENTS.join(", ")} (got "${agent ?? ""}")`);
      return EXIT.USAGE;
    }
    const text = ["Doctrina session primer (`doctrina prime`) — the project's gates, rules and open work:", "",
      ...renderView("prime", collectSnapshot(projectRoot)), "", ...pulse(openChanges(projectRoot))]
      .join("\n").replace(/\x1b\[[0-9;]*m/g, "").slice(0, HOOK_MAX_CHARS);
    console.log(agent === "cursor" ? JSON.stringify({ additional_context: text }) : text);
    return 0;
  }
  const view = flagBool(flags, "rules", false) ? "rules" : "prime";
  for (const line of renderView(view, collectSnapshot(projectRoot))) console.log(line);
  return 0;
}

export const help = `
Usage: doctrina prime [--rules | --pulse | --hook claude|cursor]

Print the session primer: gate digest, standing rules (accepted ADR
titles + non-goal count), open work with task progress, and the top
next actions — the ~40-line read that orients an agent at session
start without paying for the full context pack.

The same view as \`doctrina status --view prime\`; both render one
collection of the tree, so they cannot disagree.

  --rules   Print the standing rules in full instead of the primer: every
            accepted ADR and every declared non-goal — what the removed
            \`doctrina constitution\` printed, from the same collection.
  --pulse   One line for a per-prompt agent hook: the open change(s), or
            that a request changing behaviour opens one with \`work\`.
  --hook <agent>
            The primer plus the pulse, as the agent's session-start hook
            reads it: plain text for claude, {"additional_context"} JSON
            for cursor; cut at 9,000 characters. \`doctrina adapter add
            claude|cursor\` installs the hooks that call these.

Read-only; always exits 0. Deeper reads: \`doctrina context\`,
\`doctrina why <cap>\`, \`doctrina show <ref>\`.
`;
