// @ts-check
import path from "node:path";
import process from "node:process";
import { exists, isFile, read } from "../lib/fs-ops.js";
import { findWorkspace, readWorkspace } from "../lib/workspace.js";
import { listDeliveries } from "../lib/delivery.js";
import { workspacePrimer } from "../lib/workspace-agents.js";
import { projectWorkspaceLine } from "../lib/workspace-view.js";
import { flagBool, flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { EXIT, notADoctrinaProject } from "../lib/exit-codes.js";
import { collectSnapshot, openChanges, recentlyClosed } from "../lib/snapshot.js";
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
    // At a workspace root the session belongs to the orchestrator (change
    // 0223): the primer is the workspace's.
    const found = findWorkspace(projectRoot);
    if (found && found.via !== "pointer") return primeWorkspace(found.dir, flags);
    throw notADoctrinaProject();
  }
  // --rules: the standing rules in full, which is what the removed
  // `constitution` printed (changes 0049, 0175). The primer names the ADRs and counts the non-goals; this
  // prints both lists, from the same collection, so the two cannot disagree.
  // --pulse: one line for a per-prompt hook — the open changes only, read
  // without collecting the gates, because it runs before every prompt.
  if (flagBool(flags, "pulse", false)) {
    // Run by Cursor as the Claude adapter's UserPromptSubmit (sixth audit,
    // change 0237): Cursor imports `.claude/settings.json` hooks and runs it
    // as beforeSubmitPrompt, whose answer is `{"continue": …}` and cannot add
    // context. The plain-text line Claude Code reads is not that.
    if (underCursor()) {
      console.log(JSON.stringify({ continue: true }));
      return 0;
    }
    for (const line of pulse(openChanges(projectRoot), recentlyClosed(projectRoot, { limit: 1 }))) console.log(line);
    return 0;
  }
  if (flags.has("hook")) {
    const agent = flagString(flags, "hook");
    if (!agent || !HOOK_AGENTS.includes(agent)) {
      console.error(c.red("error:") + ` --hook needs one of ${HOOK_AGENTS.join(", ")} (got "${agent ?? ""}")`);
      return EXIT.USAGE;
    }
    const as = hookFlavour(agent, projectRoot);
    if (as === null) return 0;
    const text = ["Doctrina session primer (`doctrina prime`) — the project's gates, rules and open work:", "",
      ...renderView("prime", collectSnapshot(projectRoot)), ...workspaceLines(projectRoot), "", ...pulse(openChanges(projectRoot), recentlyClosed(projectRoot, { limit: 1 }))]
      .join("\n").replace(/\x1b\[[0-9;]*m/g, "").slice(0, HOOK_MAX_CHARS);
    console.log(as === "cursor" ? JSON.stringify({ additional_context: text }) : text);
    return 0;
  }
  const view = flagBool(flags, "rules", false) ? "rules" : "prime";
  for (const line of renderView(view, collectSnapshot(projectRoot))) console.log(line);
  if (view === "prime") for (const line of workspaceLines(projectRoot)) console.log(line);
  return 0;
}

// Cursor runs the hooks Claude Code's `.claude/settings.json` declares too
// (its "third-party" import, on by default), and sets CURSOR_VERSION and
// CURSOR_PROJECT_DIR for every hook it runs (sixth audit, change 0237).
function underCursor(env = process.env) {
  return Boolean(env.CURSOR_VERSION && env.CURSOR_PROJECT_DIR);
}

/**
 * The format a session hook answers in, or null to answer nothing. The
 * Claude adapter's SessionStart, run by Cursor, printed plain text where
 * Cursor reads JSON — and beside the Cursor adapter's own sessionStart it
 * put the primer in twice. Under Cursor it yields to that hook when the
 * folder has one, and speaks Cursor's format when it has not.
 * @returns {"claude" | "cursor" | null}
 */
function hookFlavour(agent, dir) {
  if (agent !== "claude" || !underCursor()) return /** @type {"claude" | "cursor"} */ (agent);
  const own = path.join(dir, ".cursor", "hooks.json");
  return isFile(own) && /prime --hook cursor/.test(read(own)) ? null : "cursor";
}

// A project inside a workspace says so (change 0230): a session opened in
// the repository — an executor's, or the human's — otherwise never learns a
// delivery is open on it, or where its planner works.
function workspaceLines(projectRoot) {
  const w = projectWorkspaceLine(projectRoot);
  if (!w) return [];
  const out = ["", `Workspace  ${w.name} (${w.dir}) — this repository is "${w.project}"`];
  for (const d of w.deliveries) {
    out.push(`  open delivery ${d.id} — ${d.title}: ${d.changes.length ? `this project's change ${d.changes.join(", ")}` : "no change here yet"}`);
  }
  if (w.deliveries.length === 0) out.push("  no open delivery routes here");
  return out;
}

function primeWorkspace(wsDir, flags) {
  const ws = readWorkspace(wsDir);
  const open = listDeliveries(wsDir).filter((d) => d.status !== "closed");
  if (flagBool(flags, "pulse", false)) {
    console.log(open.length === 0
      ? "Doctrina workspace: no delivery is open — an item of work across repositories opens one with `doctrina delivery new \"<title>\" --ref <id>`."
      : open.map((d) => `open delivery: ${d.id} — "${d.title}" (${d.projects.join(", ") || "not routed"}). Name it in your first sentence to the human; \`doctrina delivery status ${d.id}\`.`).join(" "));
    return 0;
  }
  const lines = workspacePrimer(ws, wsDir, open);
  if (flags.has("hook")) {
    const agent = flagString(flags, "hook");
    if (!agent || !HOOK_AGENTS.includes(agent)) {
      console.error(c.red("error:") + ` --hook needs one of ${HOOK_AGENTS.join(", ")} (got "${agent ?? ""}")`);
      return EXIT.USAGE;
    }
    const as = hookFlavour(agent, wsDir);
    if (as === null) return 0;
    const text = [...lines, "", read(path.join(wsDir, "AGENTS.md"))].join("\n").replace(/\x1b\[[0-9;]*m/g, "").slice(0, HOOK_MAX_CHARS);
    console.log(as === "cursor" ? JSON.stringify({ additional_context: text }) : text);
    return 0;
  }
  for (const line of lines) console.log(line);
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

At a workspace root (no .doctrina/, a workspace.json) it is the
orchestrator's primer: the projects and their state, the open deliveries,
the tools — and with --hook, the workspace's AGENTS.md after it.

Read-only; always exits 0. Deeper reads: \`doctrina context\`,
\`doctrina why <cap>\`, \`doctrina show <ref>\`.
`;
