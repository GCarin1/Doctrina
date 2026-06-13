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

  // ADRs stuck in proposed need a human decision.
  const adrDir = path.join(projectRoot, ".doctrina", "decisions");
  for (const f of walk(adrDir)) {
    if (!f.endsWith(".md")) continue;
    const m = path.basename(f).match(/^(\d{4})-/);
    if (!m) continue;
    const status = listHeader(read(f), "Status");
    if (status && status.toLowerCase() === "proposed") {
      actions.push(`review ADR ${m[1]} (${relPath(projectRoot, f)}): doctrina decision accept ${m[1]}, or supersede it`);
    }
  }

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

export const help = `
Usage: doctrina next

Inspect the .doctrina/ tree and print the recommended next workflow
actions in priority order: open changes (missing proposal, unchecked
tasks, deltas ready to apply, applied-but-unarchived), ADRs still in
proposed status, and index drift. Read-only; always exits 0.

Intended use: agents and humans run it to resume work without
re-reading the whole tree.
`;
