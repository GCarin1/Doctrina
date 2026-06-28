import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read, relPath, walk } from "../lib/fs-ops.js";
import * as idx from "../lib/index-json.js";
import { deriveIndex, indexesMatch, listHeader } from "../lib/scan.js";
import { c } from "../lib/colors.js";

export async function run(_positional, _flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    console.log("1. doctrina init — this directory is not a Doctrina project yet");
    return 0;
  }

  const actions = [];

  // A pending intake is the very first thing to resolve: until it is
  // converted, product.md and the specs are still empty scaffolding.
  const intakePath = path.join(projectRoot, ".doctrina", "intake.md");
  if (isFile(intakePath)) {
    const status = (listHeader(read(intakePath), "Status") ?? "pending").toLowerCase();
    if (status !== "converted") {
      actions.push("doctrina intake — a pending intake awaits conversion into product.md and specs");
    }
  }

  // Open changes drive the loop: finish what is started before opening more.
  const changesDir = path.join(projectRoot, ".doctrina", "changes");
  if (isDir(changesDir)) {
    for (const id of readdirSync(changesDir).sort()) {
      if (id === "archive" || id.startsWith(".")) continue;
      if (!isDir(path.join(changesDir, id))) continue;
      const proposalPath = path.join(changesDir, id, "proposal.md");
      if (!isFile(proposalPath)) {
        actions.push(`add a proposal.md to .doctrina/changes/${id}/ (open changes need one)`);
        continue;
      }
      const status = listHeader(read(proposalPath), "Status") ?? "proposed";
      if (status === "applied") {
        actions.push(`doctrina change archive ${id} — applied but not archived`);
        continue;
      }
      const tasksPath = path.join(changesDir, id, "tasks.md");
      const unchecked = isFile(tasksPath)
        ? (read(tasksPath).match(/^-\s+\[ \]/gm) ?? []).length
        : 0;
      if (unchecked > 0) {
        actions.push(`complete ${unchecked} open task${unchecked === 1 ? "" : "s"} in .doctrina/changes/${id}/tasks.md`);
        continue;
      }
      const deltas = walk(path.join(changesDir, id, "specs")).filter((p) => p.endsWith("delta.md"));
      if (deltas.length > 0) {
        actions.push(`doctrina analyze ${id}, then doctrina change apply ${id} — tasks done, ${deltas.length} delta${deltas.length === 1 ? "" : "s"} ready`);
      } else {
        actions.push(`add spec deltas under .doctrina/changes/${id}/specs/, or apply as metadata-only: doctrina change apply ${id}`);
      }
    }
  }

  // ADRs stuck in proposed need a human decision; accepted-but-bare ADRs are
  // the rot the review flagged — a decision with nothing behind it (no Evidence,
  // no Landed) is drift waiting to be superseded. Surface the proposed ones
  // first (a pending decision blocks more than a missing stamp).
  const adrDir = path.join(projectRoot, ".doctrina", "decisions");
  const landNudges = [];
  const isBareValue = (v) => {
    const t = (v ?? "").trim();
    return t === "" || t === "—" || t === "-";
  };
  for (const f of walk(adrDir)) {
    if (!f.endsWith(".md")) continue;
    const m = path.basename(f).match(/^(\d{4})-/);
    if (!m) continue;
    const text = read(f);
    const status = listHeader(text, "Status");
    if (status && status.toLowerCase() === "proposed") {
      actions.push(`review ADR ${m[1]} (${relPath(projectRoot, f)}): doctrina decision accept ${m[1]}, or supersede it`);
    } else if (status && status.toLowerCase() === "accepted") {
      // Bare only when BOTH anchors are empty (Evidence header present-but-bare
      // and no Landed stamp). An ADR that opts out of Evidence entirely
      // (header absent) is not nagged.
      const evidence = listHeader(text, "Evidence");
      const landed = listHeader(text, "Landed");
      if (evidence !== null && isBareValue(evidence) && isBareValue(landed)) {
        landNudges.push(`record what proves ADR ${m[1]}: cite its **Evidence:**, or once it ships, doctrina decision land ${m[1]}`);
      }
    }
  }
  for (const n of landNudges) actions.push(n);

  // No procedural memory captured yet, but the history shows a fix-shaped
  // change — exactly the lesson a skill exists to keep from being relearned
  // (review §5: the change-0003 "tolerate LLM code fences" case). One gentle
  // nudge, only when skills are empty, so it never nags a project that opted in.
  const skillNudge = suggestSkillCapture(projectRoot);
  if (skillNudge) actions.push(skillNudge);

  // Index drift is silent rot; surface it last.
  try {
    const current = idx.load(projectRoot);
    if (!indexesMatch(deriveIndex(projectRoot, current), current)) {
      actions.push("doctrina index rebuild — index.json has drifted from the tree");
    }
  } catch {
    actions.push("doctrina index rebuild — index.json is missing or unreadable");
  }

  if (actions.length === 0) {
    console.log(c.green("ok") + " no open work.");
    console.log("");
    console.log("Start something:");
    console.log(`  doctrina change new <id> "<title>"   open a change proposal`);
    console.log(`  doctrina spec new <capability>       spec a new capability`);
    return 0;
  }

  console.log(c.bold("Next actions") + c.gray(" (in priority order):"));
  console.log("");
  actions.forEach((a, i) => console.log(`${i + 1}. ${a}`));
  return 0;
}

// Return a single skill-capture nudge, or null. Fires only when no skill has
// been written yet (skills/ holds nothing but .gitkeep) AND the archive shows a
// fix-shaped change whose lesson is the textbook case for a skill. Deterministic
// pattern match on the archived folder name — a hint, never a decision (ADR 0005).
const FIX_SHAPED = /(?:^|-)(fix|bug|hotfix|patch|parse|parsing|tolerate|workaround|race|deadlock|flaky|retry|escape|sanitize|sanitise)(?:-|$)/;

function suggestSkillCapture(projectRoot) {
  const skillsDir = path.join(projectRoot, ".doctrina", "skills");
  if (isDir(skillsDir)) {
    const hasSkill = walk(skillsDir).some((f) => f.endsWith(".md"));
    if (hasSkill) return null; // opted in already — never nag
  }
  const archiveDir = path.join(projectRoot, ".doctrina", "changes", "archive");
  if (!isDir(archiveDir)) return null;
  for (const name of readdirSync(archiveDir).sort()) {
    if (!isDir(path.join(archiveDir, name))) continue;
    const id = name.replace(/^\d{4}-\d{2}-\d{2}-/, "");
    if (FIX_SHAPED.test(id)) {
      return `capture a skill from past fixes (e.g. "${id}"): doctrina skill new <slug> — ` +
        `on-demand procedural memory so the next agent does not relearn it (none exist yet)`;
    }
  }
  return null;
}

export const help = `
Usage: doctrina next

Inspect the .doctrina/ tree and print the recommended next workflow
actions in priority order: open changes (missing proposal, unchecked
tasks, deltas ready to apply, applied-but-unarchived), ADRs still in
proposed status, accepted ADRs with nothing proving them (cite Evidence
or run "decision land"), a skill-capture nudge when a past fix went
uncaptured, and index drift last. Read-only; always exits 0.

Intended use: agents and humans run it to resume work without
re-reading the whole tree.
`;
