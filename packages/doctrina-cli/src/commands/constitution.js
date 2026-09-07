// @ts-check
import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read } from "../lib/fs-ops.js";
import { listHeader } from "../lib/scan.js";
import { c } from "../lib/colors.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";
import { acceptedDecisions, productSection } from "../lib/constitution-model.js";
import { collectSnapshot } from "../lib/snapshot.js";
import { renderView } from "../lib/views.js";

// Read by the project snapshot as well; see lib/constitution-model.js.
export { acceptedDecisions, productSection } from "../lib/constitution-model.js";

// The project's standing rules in one read — Spec Kit parity for its
// `constitution.md`, but ASSEMBLED, not a new home for facts. Doctrina's
// constitution is its accepted ADRs (the immutable decisions that govern how
// the codebase evolves) plus the product's declared non-goals. Both already
// own those facts elsewhere; this is a read-only digest that gathers them so a
// human or agent (especially one migrating from Spec Kit, which expects a
// single constitution) can see "the rules" without reading the whole tree.
//
// To change a principle, supersede its ADR; to change a non-goal, edit
// product.md. The command never writes — it has nothing of its own to own.

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json"], string: [] };

export async function run(_positional, _flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }
  // Deprecated (change 0049): the standing rules are a VIEW of the shared
  // collection, and `prime --rules` renders it. This command prints the same
  // lines — not a similar set, the same ones — so the deprecation is a
  // rename with a warning rather than a loss.
  for (const line of renderView("rules", collectSnapshot(projectRoot))) console.log(line);
  return 0;
}

function projectName(projectRoot) {
  try {
    return JSON.parse(read(path.join(projectRoot, ".doctrina", "index.json"))).project
      ?? path.basename(projectRoot);
  } catch {
    return path.basename(projectRoot);
  }
}


export const help = `
Usage: doctrina constitution

Print the project's standing rules in one read: the accepted ADRs (the
immutable decisions that govern how the codebase evolves) and the product's
declared non-goals. Read-only — it assembles facts the ADRs and product.md
already own; it never writes.

This is the Spec Kit \`constitution.md\` analogue: a single place to see the
non-negotiables. To change one, supersede the ADR or edit product.md.

DEPRECATED: use \`doctrina prime --rules\`, which prints exactly these lines.
This name keeps working and will be removed in a future minor.
`;
