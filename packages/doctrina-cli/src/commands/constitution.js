// @ts-check
import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read } from "../lib/fs-ops.js";
import { listHeader } from "../lib/scan.js";
import { c } from "../lib/colors.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";
import { acceptedDecisions, productSection } from "../lib/constitution-model.js";

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

  const project = projectName(projectRoot);
  console.log(
    c.bold("Doctrina constitution") +
      c.gray(` — ${project}  (standing rules: accepted decisions + non-goals)`),
  );

  // Principles — the accepted ADRs, by number. Every accepted decision is a
  // binding rule; superseded/withdrawn/proposed ADRs are not yet (or no longer)
  // in force and stay out.
  console.log("");
  console.log(c.bold("  Principles") + c.gray("  (immutable — supersede an ADR to change one)"));
  const adrs = acceptedDecisions(projectRoot);
  if (adrs.length === 0) {
    console.log(`    ${c.gray("no accepted ADRs yet — record decisions with `doctrina decision new`")}`);
  } else {
    for (const a of adrs) console.log(`    ${c.cyan("ADR " + a.id)}  ${a.title}`);
  }

  // Non-goals — the explicit "what this project will not be", from product.md.
  console.log("");
  console.log(c.bold("  Non-goals") + c.gray("  (.doctrina/product.md)"));
  const nonGoals = productSection(projectRoot, "Non-goals");
  if (nonGoals.length === 0) {
    console.log(`    ${c.gray("none declared — add a `## Non-goals` section to product.md")}`);
  } else {
    for (const g of nonGoals) console.log(`    ${c.gray("•")} ${g}`);
  }

  console.log("");
  console.log(
    c.gray(
      `  ${adrs.length} accepted decision${adrs.length === 1 ? "" : "s"} · ` +
        `${nonGoals.length} non-goal${nonGoals.length === 1 ? "" : "s"} · read-only`,
    ),
  );
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
`;
