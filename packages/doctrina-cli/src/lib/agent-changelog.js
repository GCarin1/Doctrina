// @ts-check
// Drafting the agent-facing changelog from what actually shipped.
//
// `AGENT_CHANGELOG` in lib/commands.js is the block `upgrade --write` writes
// into AGENTS.md: at most five bullets telling an arriving agent what it must
// now DO differently. It is an object literal somebody edits by hand at every
// release, in parallel with a 57 KB prose CHANGELOG describing the same
// changes for people — and the comment above it already admits the approach
// "worked once and does not scale" (audit finding F22).
//
// This module does not write it. It DRAFTS candidates, from the signals the
// docs gate already extracts per archived change — the commands, flags and
// exit codes that change said it touched. Authorship stays human, because
// what an agent must do differently is a judgement about behaviour, and the
// CLI does not make those (ADR 0005). What it removes is the remembering.
import path from "node:path";
import { isDir } from "./fs-ops.js";
import { readLedger } from "./ledger.js";
import { documentedSurfaceSignals } from "./docs-impact.js";
import { AGENT_CHANGELOG_MAX_BULLETS } from "./commands.js";
import { lastTagDate, windowCutoff } from "./git.js";

/**
 * Which window a draft covers, and why that window.
 *
 * "Since the last tag" is the honest default: the block describes the
 * release being cut, and the last tag is where the previous one ended. With
 * no tags (a young project, a shallow clone) it falls back to a day window
 * and SAYS which it used — a draft that quietly covered the wrong period
 * would be worse than one that names its edges.
 *
 * @param {string} projectRoot
 * @param {{days?: number|null}} [options]
 * @returns {{since: string, basis: string}}
 */
export function draftWindow(projectRoot, { days = null } = {}) {
  if (days !== null) return { since: windowCutoff(days), basis: `the last ${days} days` };
  const tag = lastTagDate(projectRoot);
  if (tag) return { since: tag, basis: "changes archived since the last tag" };
  return { since: windowCutoff(30), basis: "the last 30 days (no tag to measure from)" };
}

/**
 * Candidate bullets for the agent changelog, newest first.
 *
 * One candidate per archived change in the window that touched a documented
 * surface. A change that touched none produces nothing — the block is for
 * what an agent must do differently, and a change no agent can observe is
 * not that.
 *
 * @param {string} projectRoot
 * @param {{days?: number|null, max?: number}} [options]
 * @returns {{
 *   since: string, basis: string, max: number,
 *   candidates: {id: string, date: string, title: string, signals: string[], bullet: string}[],
 *   silent: {id: string, date: string, title: string}[],
 *   truncated: number
 * }}
 */
export function draftAgentChangelog(projectRoot, { days = null, max = AGENT_CHANGELOG_MAX_BULLETS } = {}) {
  const { since, basis } = draftWindow(projectRoot, { days });
  const archiveDir = path.join(projectRoot, ".doctrina", "changes", "archive");

  const candidates = [];
  const silent = [];
  // The ledger is the record of what landed and when (change 0046); the
  // archived folder is where the change's own artifacts still are.
  const landed = readLedger(projectRoot).entries
    .filter((e) => e.kind === "archived" && e.date >= since)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  for (const entry of landed) {
    const dir = path.join(archiveDir, `${entry.date}-${entry.id}`);
    const signals = isDir(dir) ? documentedSurfaceSignals(dir) : [];
    if (signals.length === 0) {
      silent.push({ id: entry.id, date: entry.date, title: entry.title });
      continue;
    }
    candidates.push({
      id: entry.id,
      date: entry.date,
      title: entry.title,
      signals,
      bullet: `${entry.title} (${signals.join("; ")}).`,
    });
  }

  const truncated = Math.max(0, candidates.length - max);
  return { since, basis, max, candidates: candidates.slice(0, max), silent, truncated };
}

/**
 * The draft, rendered as the block a human edits into lib/commands.js.
 *
 * Deliberately shaped as the literal it will become, so the step is "cut and
 * reword", not "translate". The bullets are drafts of the SHAPE — a title and
 * the surface it touched — and every one of them is expected to be rewritten
 * into what an agent must now do.
 *
 * @param {ReturnType<typeof draftAgentChangelog>} draft
 * @param {string} version
 * @returns {string[]} lines
 */
export function renderDraft(draft, version) {
  const out = [];
  out.push(`# Agent changelog draft for ${version} — ${draft.basis} (since ${draft.since})`);
  out.push("");
  if (draft.candidates.length === 0) {
    out.push("No archived change in this window touched a documented surface.");
    out.push("Nothing to tell an arriving agent — which is a valid answer, not an empty one.");
    return out;
  }
  out.push("Proposed, newest first. REWRITE each into what an agent must now DO;");
  out.push("this draft only knows what surface the change touched.");
  out.push("");
  out.push(`  "${version}": [`);
  for (const cand of draft.candidates) {
    out.push(`    // ${cand.date} ${cand.id}`);
    out.push(`    ${JSON.stringify(cand.bullet)},`);
  }
  out.push("  ],");
  if (draft.truncated > 0) {
    out.push("");
    out.push(`${draft.truncated} further candidate${draft.truncated === 1 ? "" : "s"} did not fit the ${draft.max}-bullet cap.`);
    out.push("The cap is AGENTS.md's line budget, not a preference: choose, do not raise it.");
  }
  if (draft.silent.length > 0) {
    out.push("");
    out.push(`${draft.silent.length} change${draft.silent.length === 1 ? "" : "s"} touched no documented surface and are not proposed:`);
    for (const s of draft.silent) out.push(`  ${s.date} ${s.id}`);
  }
  return out;
}
