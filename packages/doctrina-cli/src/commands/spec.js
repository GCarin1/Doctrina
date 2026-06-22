import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, lineCount, read, relPath, write } from "../lib/fs-ops.js";
import { locateTemplatesDir, substitute } from "../lib/templates.js";
import { specHeader, deriveIndex } from "../lib/scan.js";
import { setHeader, bumpVersion, setCriterionMark } from "../lib/spec-ops.js";
import * as idx from "../lib/index-json.js";
import { today } from "../lib/dates.js";
import { flagBool, flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { suggest } from "../lib/suggest.js";

const SUBCOMMANDS = ["new", "list", "set"];

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
  if (sub === "set") return specSet(positional.slice(1), flags);

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
  // Two axes: a fresh capability scaffold is a draft document for a
  // planned capability. Promote `status` to active once it reflects
  // intent; advance `implementation` as code lands (see `doctrina
  // coverage`). Bug specs are a different shape and stay off the
  // implementation axis — only the capability template carries it.
  const entry = {
    id: capability,
    path: `.doctrina/specs/${capability}/spec.md`,
    status: bug ? "active" : "draft",
    version: "0.1.0",
    last_updated: date,
  };
  if (!bug) entry.implementation = "planned";
  idx.addSpec(index, entry);
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
      // Show only the leading state word of Implementation, dropping any
      // explanatory note after it ("planned — deferred" -> "planned").
      const implRaw = specHeader(text, "Implementation");
      rows.push({
        id: cap,
        version: specHeader(text, "Version") ?? "—",
        status: specHeader(text, "Status") ?? "active",
        impl: implRaw ? implRaw.trim().split(/[\s—-]+/)[0] : "—",
        lines: lineCount(p),
        updated: specHeader(text, "Last updated") ?? "—",
      });
    }
  }
  if (rows.length === 0) {
    console.log(c.gray("no specs found in .doctrina/specs/"));
    return 0;
  }
  console.log(c.bold("Specs:") + c.gray("  (status = document, impl = capability)"));
  console.log("");
  for (const r of rows) {
    console.log(`  ${c.cyan(r.id.padEnd(20))} ${r.version.padEnd(8)} ${r.status.padEnd(10)} ${r.impl.padEnd(12)} ${String(r.lines).padStart(4)} lines  ${r.updated}`);
  }
  console.log("");
  console.log(c.gray(`${rows.length} spec${rows.length === 1 ? "" : "s"}`));
  return 0;
}

// Edit a spec's bookkeeping headers (and a criterion mark) and resync the
// index in one step — the inverse drift footgun the review hit (G8): a manual
// "bump the version in the spec, then bump it again in index.json" lockstep.
// Reuses the same structured ops as `change apply` (ADR 0007), so the header
// and the index can never diverge after a `spec set`.
function specSet(args, flags) {
  const capability = args[0];
  if (!capability || !/^[a-z][a-z0-9-]*$/.test(capability)) {
    console.error(c.red("error:") + " spec set requires a <capability> (lowercase letters, digits, hyphens)");
    return 2;
  }
  const projectRoot = process.cwd();
  ensureDoctrinaProject(projectRoot);

  const specPath = path.join(projectRoot, ".doctrina", "specs", capability, "spec.md");
  if (!isFile(specPath)) {
    console.error(c.red("error:") + ` no spec at ${relPath(projectRoot, specPath)} (create it with \`doctrina spec new ${capability}\`)`);
    return 1;
  }

  const impl = flagString(flags, "implementation");
  const status = flagString(flags, "status");
  const bump = flagString(flags, "bump");
  const criterion = flagString(flags, "criterion");
  if (impl === undefined && status === undefined && bump === undefined && criterion === undefined) {
    console.error(c.red("error:") + " spec set needs at least one of --implementation, --status, --bump, --criterion");
    console.error(c.gray("hint: ") + `example: doctrina spec set ${capability} --implementation "verified — \`src/x.js\`" --bump minor`);
    return 2;
  }

  let text = read(specPath);
  const applied = [];
  const errors = [];
  const apply = (res) => {
    if (res.error) errors.push(res.error);
    else { text = res.text; applied.push(res.summary); }
  };
  // Order: headers, then version, then criterion — independent edits, all or
  // none (a failed op leaves the spec untouched, like `change apply`).
  if (status !== undefined) apply(setHeader(text, "Status", status));
  if (impl !== undefined) apply(setHeader(text, "Implementation", impl));
  if (bump !== undefined) {
    if (!["major", "minor", "patch"].includes(bump)) errors.push(`--bump needs major|minor|patch (got "${bump}")`);
    else apply(bumpVersion(text, bump));
  }
  if (criterion !== undefined) {
    const m = String(criterion).match(/^(\d+)\s*:\s*(.+)$/);
    if (!m) errors.push(`--criterion needs "<n>:<mark>" (got "${criterion}")`);
    else apply(setCriterionMark(text, Number(m[1]), m[2].trim()));
  }

  if (errors.length > 0) {
    console.error(c.red("error:") + ` ${errors.length} operation error${errors.length === 1 ? "" : "s"} — spec left untouched:`);
    for (const e of errors) console.error(`  - ${e}`);
    return 1;
  }

  // Stamp Last updated when the header exists (best-effort, never an error).
  const date = today();
  const lu = setHeader(text, "Last updated", date);
  if (!lu.error) text = lu.text;

  write(specPath, text, { force: true });
  console.log(c.green("updated") + ` ${relPath(projectRoot, specPath)}`);
  for (const s of applied) console.log(c.gray(`    · ${s}`));

  // Single source of truth: regenerate the index from the now-updated tree so
  // the spec headers and the index can never drift (no manual lockstep — G8).
  const index = idx.load(projectRoot);
  const derived = deriveIndex(projectRoot, index);
  derived.last_updated = date;
  idx.save(projectRoot, derived);
  console.log(c.green("indexed") + ` spec "${capability}" synced`);
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
  set <capability> [opts]              Edit a spec's headers / a criterion
                                       mark and resync the index in one step
                                       (no manual lockstep bump — G8).

Options:
  --bug                  Scaffold the bug-shape template (current / expected /
                         unchanged behaviour) instead of the EARS capability spec.
  --force                Overwrite an existing spec (with \`new\`).
  --implementation "..." With \`set\`: set the Implementation header.
  --status "..."         With \`set\`: set the Status header.
  --bump major|minor|patch  With \`set\`: bump the spec Version.
  --criterion "<n>:<mark>"  With \`set\`: set criterion n's [mark]
                         (e.g. --criterion "2:verified").
`;
