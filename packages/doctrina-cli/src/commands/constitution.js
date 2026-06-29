import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read } from "../lib/fs-ops.js";
import { listHeader } from "../lib/scan.js";
import { c } from "../lib/colors.js";

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

export async function run(_positional, _flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
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

// Accepted ADRs (NNNN-slug.md with Status: accepted), oldest first, with the
// title read from the `# ADR NNNN — <title>` heading.
function acceptedDecisions(projectRoot) {
  const dir = path.join(projectRoot, ".doctrina", "decisions");
  const out = [];
  if (!isDir(dir)) return out;
  for (const f of readdirSync(dir).sort()) {
    const m = f.match(/^(\d{4})-.*\.md$/);
    if (!m) continue;
    const text = read(path.join(dir, f));
    if ((listHeader(text, "Status") ?? "").toLowerCase() !== "accepted") continue;
    const titleMatch = text.match(/^#\s+ADR\s+\d{4}\s*[—-]\s*(.+)$/m);
    out.push({ id: m[1], title: titleMatch ? titleMatch[1].trim() : f });
  }
  return out;
}

// Bullets under a named `## <section>` of product.md, each accumulated across
// its continuation lines so a wrapped bullet reads as one rule.
function productSection(projectRoot, name) {
  const p = path.join(projectRoot, ".doctrina", "product.md");
  if (!isFile(p)) return [];
  const lines = read(p).split(/\r?\n/);
  let inSection = false;
  const out = [];
  let cur = null;
  const flush = () => {
    if (cur) out.push(cur.replace(/\s+/g, " ").trim());
    cur = null;
  };
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      if (inSection) {
        flush();
        break;
      }
      if (new RegExp(`^##\\s+${name}\\b`, "i").test(line)) inSection = true;
      continue;
    }
    if (!inSection) continue;
    const m = line.match(/^\s*[-*]\s+(.+)$/);
    if (m) {
      flush();
      cur = m[1];
    } else if (cur && line.trim() !== "") {
      cur += " " + line.trim();
    } else if (line.trim() === "") {
      flush();
    }
  }
  flush();
  return out;
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
