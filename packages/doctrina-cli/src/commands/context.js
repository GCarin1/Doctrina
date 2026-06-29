import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, lineCount, read, relPath, walk } from "../lib/fs-ops.js";
import { listHeader } from "../lib/scan.js";
import { parseFrontmatter } from "./skill.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";

// Materialise the AGENTS.md read order as a command: print the exact
// context pack for a task, in the order an agent should read it. This is
// the context-engineering thesis turned into tooling — selection over
// dumping, ranked by the documented read order.

export async function run(positional, flags) {
  const capability = positional[0] ?? null;
  const concat = flagBool(flags, "concat", false);
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }

  if (capability && !/^[a-z][a-z0-9-]*$/.test(capability)) {
    console.error(c.red("error:") + ` invalid capability "${capability}" (lowercase letters, digits, hyphens)`);
    return 2;
  }

  const pack = [];
  const pushFile = (rel, note) => {
    const full = path.join(projectRoot, rel);
    if (isFile(full)) pack.push({ rel, lines: lineCount(full), note });
  };

  // 1-2. Root rules and product truth — always first. Displayed paths are
  // POSIX strings (path.join would emit backslashes on Windows).
  pushFile("AGENTS.md", "root rules");
  pushFile(".doctrina/product.md", "product truth");

  // 3. The capability spec(s) — the current truth. With a named capability,
  //    just that one. Without one, EVERY active spec: the default orientation
  //    read previously jumped from product.md straight to the ADRs, leaving
  //    the single source of truth out of the pack entirely (a review/debug/
  //    question read got history but not current truth). Specs come before
  //    open changes and ADRs, matching the documented read order.
  let specMissing = false;
  const specsRoot = path.join(projectRoot, ".doctrina", "specs");
  if (capability) {
    const specRel = `.doctrina/specs/${capability}/spec.md`;
    if (isFile(path.join(projectRoot, specRel))) {
      pushFile(specRel, `spec: ${capability}`);
    } else {
      specMissing = true;
    }
  } else if (isDir(specsRoot)) {
    for (const cap of readdirSync(specsRoot).sort()) {
      const specRel = `.doctrina/specs/${cap}/spec.md`;
      if (isFile(path.join(projectRoot, specRel))) pushFile(specRel, `spec: ${cap}`);
    }
  }

  // 4. Open changes (their proposal, tasks, and deltas).
  const changesDir = path.join(projectRoot, ".doctrina", "changes");
  if (isDir(changesDir)) {
    for (const id of readdirSync(changesDir).sort()) {
      if (id === "archive" || id.startsWith(".")) continue;
      if (!isDir(path.join(changesDir, id))) continue;
      for (const f of walk(path.join(changesDir, id))) {
        if (!f.endsWith(".md")) continue;
        pushFile(relPath(projectRoot, f), `open change: ${id}`);
      }
    }
  }

  // 5. Accepted ADRs only — superseded/withdrawn stay out of the pack.
  const adrDir = path.join(projectRoot, ".doctrina", "decisions");
  for (const f of walk(adrDir)) {
    if (!f.endsWith(".md")) continue;
    const status = (listHeader(read(f), "Status") ?? "").toLowerCase();
    if (status === "accepted") pushFile(relPath(projectRoot, f), "accepted ADR");
  }

  // 6. Skills are on-demand: list name + description, never the body.
  const onDemand = [];
  const skillsDir = path.join(projectRoot, ".doctrina", "skills");
  for (const f of walk(skillsDir)) {
    if (!f.endsWith(".md")) continue;
    const text = read(f);
    onDemand.push({
      rel: relPath(projectRoot, f),
      name: parseFrontmatter(text, "name") ?? path.basename(f, ".md"),
      description: parseFrontmatter(text, "description") ?? "<missing description>",
    });
  }

  if (concat) {
    for (const item of pack) {
      console.log(`===== ${item.rel} (${item.note}) =====`);
      console.log("");
      console.log(read(path.join(projectRoot, item.rel)).trimEnd());
      console.log("");
    }
  } else {
    console.log(c.bold("Context pack") + (capability ? c.gray(` (capability: ${capability})`) : "") + c.gray(" — read in this order:"));
    console.log("");
    pack.forEach((item, i) => {
      console.log(`${i + 1}. ${c.cyan(item.rel.padEnd(56))} ${String(item.lines).padStart(4)} lines  ${c.gray(item.note)}`);
    });
    const total = pack.reduce((sum, item) => sum + item.lines, 0);
    console.log("");
    console.log(c.gray(`${pack.length} files, ${total} lines total · archive excluded by design`));
    if (onDemand.length > 0) {
      console.log("");
      console.log(c.bold("On-demand skills") + c.gray(" (load the body only when the task matches):"));
      for (const s of onDemand) {
        console.log(`   ${c.cyan(s.name.padEnd(24))} ${s.description}  ${c.gray(s.rel)}`);
      }
    }
  }

  if (specMissing) {
    console.error("");
    console.error(c.yellow("warn:") + ` no spec for capability "${capability}" — create one with \`doctrina spec new ${capability}\``);
  }
  return 0;
}

export const help = `
Usage: doctrina context [<capability>] [--concat]

Print the exact context pack for a task, in the documented read
order: AGENTS.md, product.md, the capability spec (when given —
otherwise every active spec, so the current truth is never absent),
open changes, accepted ADRs. Skills are listed name + description only
— they are on-demand by design. The change archive is excluded.

Flags:
  --concat   Print the file contents (with separators) instead of the
             file list — ready to pipe into an agent.

Read-only; always exits 0.
`;
