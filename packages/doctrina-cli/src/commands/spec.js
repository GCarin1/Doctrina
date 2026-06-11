import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, lineCount, read, relPath, write } from "../lib/fs-ops.js";
import { locateTemplatesDir, substitute } from "../lib/templates.js";
import { specHeader } from "../lib/scan.js";
import * as idx from "../lib/index-json.js";
import { today } from "../lib/dates.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { suggest } from "../lib/suggest.js";

const SUBCOMMANDS = ["new", "list"];

export async function run(positional, flags) {
  const sub = positional[0];
  if (!SUBCOMMANDS.includes(sub)) {
    console.error(c.red("error:") + ` unknown spec subcommand "${sub ?? ""}"`);
    const guess = suggest(sub, SUBCOMMANDS);
    console.error(c.gray("hint: ") + (guess
      ? `did you mean \`doctrina spec ${guess}\`?`
      : `available: ${SUBCOMMANDS.join(", ")}`));
    return 2;
  }
  if (sub === "list") return specList();

  const capability = positional[1];
  if (!capability || !/^[a-z][a-z0-9-]*$/.test(capability)) {
    console.error(c.red("error:") + " capability must be lowercase letters, digits, or hyphens (e.g. \"core\", \"templates\").");
    return 2;
  }

  const force = flagBool(flags, "force", false);
  const bug = flagBool(flags, "bug", false);
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const targetDir = path.join(projectRoot, ".doctrina", "specs", capability);
  const targetPath = path.join(targetDir, "spec.md");
  if (exists(targetPath) && !force) {
    console.error(c.red("error:") + ` ${relPath(projectRoot, targetPath)} already exists (pass --force to overwrite)`);
    return 1;
  }

  const templatesDir = locateTemplatesDir();
  const tplName = bug ? "spec-bug.md.template" : "spec.md.template";
  const tplPath = path.join(templatesDir, tplName);
  const date = today();
  const body = substitute(read(tplPath), { CAPABILITY: capability, DATE: date });
  write(targetPath, body, { force });
  console.log(c.green("created") + ` ${relPath(projectRoot, targetPath)}${bug ? " (bug-spec shape)" : ""}`);

  const index = idx.load(projectRoot);
  idx.addSpec(index, {
    id: capability,
    path: `.doctrina/specs/${capability}/spec.md`,
    status: "active",
    version: "0.1.0",
    last_updated: date,
  });
  idx.touch(index, date);
  idx.save(projectRoot, index);
  console.log(c.green("indexed") + ` spec "${capability}"`);
  return 0;
}

function specList() {
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  const rows = [];
  if (isDir(specsDir)) {
    for (const cap of readdirSync(specsDir).sort()) {
      const p = path.join(specsDir, cap, "spec.md");
      if (!isFile(p)) continue;
      const text = read(p);
      rows.push({
        id: cap,
        version: specHeader(text, "Version") ?? "—",
        status: specHeader(text, "Status") ?? "active",
        lines: lineCount(p),
        updated: specHeader(text, "Last updated") ?? "—",
      });
    }
  }
  if (rows.length === 0) {
    console.log(c.gray("no specs found in .doctrina/specs/"));
    return 0;
  }
  console.log(c.bold("Specs:"));
  console.log("");
  for (const r of rows) {
    console.log(`  ${c.cyan(r.id.padEnd(20))} ${r.version.padEnd(8)} ${r.status.padEnd(10)} ${String(r.lines).padStart(4)} lines  ${r.updated}`);
  }
  console.log("");
  console.log(c.gray(`${rows.length} spec${rows.length === 1 ? "" : "s"}`));
  return 0;
}

function ensureDoctrinaProject(projectRoot) {
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }
}

export const help = `
Usage: doctrina spec <subcommand>

Subcommands:
  new <capability> [--bug] [--force]   Create a capability spec under
                                       .doctrina/specs/<capability>/spec.md
                                       and index it.
  list                                 One line per spec: id, version,
                                       status, line count, last updated.
                                       Read-only.

Options:
  --bug      Scaffold the bug-shape template (current / expected /
             unchanged behaviour) instead of the EARS capability spec.
  --force    Overwrite an existing spec.
`;
