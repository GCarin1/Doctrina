import path from "node:path";
import process from "node:process";
import { exists, isDir, isFile, lineCount, read, relPath, walk, write } from "../lib/fs-ops.js";
import { locateTemplatesDir } from "../lib/templates.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { suggest } from "../lib/suggest.js";

const SUBCOMMANDS = ["list", "check", "update"];

// Recommended sections per file kind. Adopters whose files lack these
// headings get a warning from `templates check`; they are recommendations,
// not hard requirements (validate handles the hard requirements).
const AGENTS_SECTIONS = [
  "## Stack",
  "## Commands",
  "## Repository structure",
  "## Conventions and boundaries",
  "## How to read context",
];
const PRODUCT_SECTIONS = [
  "## Vision",
  "## Problem",
  "## Target users",
  "## Scope",
  "## Success criteria",
];
const INDEX_FIELDS = ["$schema_version", "project", "artifacts"];

export async function run(positional, flags) {
  const sub = positional[0];
  if (!SUBCOMMANDS.includes(sub)) {
    console.error(c.red("error:") + ` unknown templates subcommand "${sub ?? ""}"`);
    const guess = suggest(sub, SUBCOMMANDS);
    console.error(c.gray("hint: ") + (guess
      ? `did you mean \`doctrina templates ${guess}\`?`
      : `available: ${SUBCOMMANDS.join(", ")}`));
    return 2;
  }
  if (sub === "list") return listTemplates();
  if (sub === "update") return updateTemplates(flags);
  return checkTemplates();
}

// Additive-only updater: appends missing recommended sections and adds
// missing index.json fields. Never rewrites or removes user content.
// Preview is the default; --write applies. This is the opt-in semantic
// the deferred register required before shipping any template updater.
function updateTemplates(flags) {
  const writeMode = flagBool(flags, "write", false);
  const projectRoot = process.cwd();
  if (!isDir(path.join(projectRoot, ".doctrina"))) {
    console.error(c.red("error:") + " not a Doctrina project (no .doctrina/ in cwd)");
    return 1;
  }

  const plan = [];

  // Markdown files: append stub sections for missing recommended headings.
  for (const [rel, sections] of [
    ["AGENTS.md", AGENTS_SECTIONS],
    [path.join(".doctrina", "product.md"), PRODUCT_SECTIONS],
  ]) {
    const filePath = path.join(projectRoot, rel);
    if (!isFile(filePath)) continue;
    const text = read(filePath);
    const missing = sections.filter((h) => !hasHeading(text, h));
    if (missing.length > 0) {
      plan.push({
        describe: missing.map((h) => `${rel}: append stub section "${h}"`),
        apply() {
          let updated = read(filePath);
          if (!updated.endsWith("\n")) updated += "\n";
          for (const h of missing) {
            updated += `\n${h}\n\n<!-- added by doctrina templates update — fill in -->\n`;
          }
          write(filePath, updated, { force: true });
        },
      });
    }
  }

  // index.json: add missing schema fields and artifact categories.
  const indexPath = path.join(projectRoot, ".doctrina", "index.json");
  if (isFile(indexPath)) {
    try {
      const idx = JSON.parse(read(indexPath));
      const describe = [];
      if (idx.$schema_version === undefined) describe.push('index.json: add "$schema_version": "0.1.0"');
      if (idx.project === undefined) describe.push(`index.json: add "project": "${path.basename(projectRoot)}"`);
      if (idx.artifacts === undefined) describe.push('index.json: add empty "artifacts" object');
      const categories = ["specs", "decisions", "changes", "changes_archive", "skills"];
      for (const cat of categories) {
        if (idx.artifacts && idx.artifacts[cat] === undefined) {
          describe.push(`index.json: add empty artifact category "${cat}"`);
        }
      }
      if (describe.length > 0) {
        plan.push({
          describe,
          apply() {
            const current = JSON.parse(read(indexPath));
            current.$schema_version ??= "0.1.0";
            current.project ??= path.basename(projectRoot);
            current.artifacts ??= {};
            for (const cat of categories) current.artifacts[cat] ??= [];
            write(indexPath, JSON.stringify(current, null, 2) + "\n", { force: true });
          },
        });
      }
    } catch {
      console.error(c.red("error:") + " .doctrina/index.json failed to parse; fix it before updating");
      return 1;
    }
  }

  const steps = plan.flatMap((p) => p.describe);
  if (steps.length === 0) {
    console.log(c.green("ok") + " project already follows the current template shape");
    return 0;
  }

  for (const s of steps) {
    console.log((writeMode ? c.green("update ") : c.yellow("would  ")) + s);
  }
  console.log("");
  if (!writeMode) {
    console.log(`${steps.length} pending update${steps.length === 1 ? "" : "s"} (preview only — nothing written)`);
    console.log(c.gray("hint: ") + "re-run with --write to apply");
    return 1;
  }
  for (const p of plan) p.apply();
  console.log(c.green("ok") + ` ${steps.length} update${steps.length === 1 ? "" : "s"} applied (additive only — review the stubs and fill them in)`);
  return 0;
}

function listTemplates() {
  const dir = locateTemplatesDir();
  const files = walk(dir).filter((f) => !f.endsWith(".gitkeep"));
  if (files.length === 0) {
    console.error(c.red("error:") + " no templates found at " + dir);
    return 1;
  }
  console.log(c.bold(`Templates shipped by the installed Doctrina CLI:`));
  console.log("");
  let maxLen = 0;
  const rows = [];
  for (const f of files) {
    const rel = relPath(dir, f);
    const lines = lineCount(f);
    rows.push({ rel, lines });
    if (rel.length > maxLen) maxLen = rel.length;
  }
  for (const r of rows) {
    console.log(`  ${r.rel.padEnd(maxLen + 2)}${String(r.lines).padStart(4)} lines`);
  }
  console.log("");
  console.log(c.gray(`${rows.length} templates · location: ${dir}`));
  return 0;
}

function checkTemplates() {
  const projectRoot = process.cwd();
  if (!isDir(path.join(projectRoot, ".doctrina"))) {
    console.error(c.red("error:") + " not a Doctrina project (no .doctrina/ in cwd)");
    console.error(c.gray("hint: ") + "run `doctrina init` first");
    return 1;
  }

  const findings = [];
  const ok = [];

  // AGENTS.md sections
  const agentsPath = path.join(projectRoot, "AGENTS.md");
  if (isFile(agentsPath)) {
    const text = read(agentsPath);
    for (const heading of AGENTS_SECTIONS) {
      if (hasHeading(text, heading)) ok.push(`AGENTS.md: ${heading}`);
      else findings.push(`AGENTS.md missing recommended section "${heading}"`);
    }
  } else {
    findings.push("AGENTS.md missing at project root");
  }

  // product.md sections
  const productPath = path.join(projectRoot, ".doctrina", "product.md");
  if (isFile(productPath)) {
    const text = read(productPath);
    for (const heading of PRODUCT_SECTIONS) {
      if (hasHeading(text, heading)) ok.push(`product.md: ${heading}`);
      else findings.push(`.doctrina/product.md missing recommended section "${heading}"`);
    }
  } else {
    findings.push(".doctrina/product.md missing");
  }

  // index.json schema fields
  const indexPath = path.join(projectRoot, ".doctrina", "index.json");
  if (isFile(indexPath)) {
    try {
      const idx = JSON.parse(read(indexPath));
      for (const field of INDEX_FIELDS) {
        if (idx[field] !== undefined) ok.push(`index.json: ${field}`);
        else findings.push(`.doctrina/index.json missing field "${field}"`);
      }
      if (idx.$schema_version && idx.$schema_version !== "0.1.0") {
        findings.push(`.doctrina/index.json $schema_version is "${idx.$schema_version}" (expected "0.1.0")`);
      }
    } catch (err) {
      findings.push(`.doctrina/index.json failed to parse: ${err.message}`);
    }
  } else {
    findings.push(".doctrina/index.json missing");
  }

  // Output
  for (const o of ok) console.log(c.green("✓ ") + o);
  for (const f of findings) console.log(c.yellow("✗ ") + f);
  console.log("");

  if (findings.length === 0) {
    console.log(c.green("ok") + " all recommended sections present");
    return 0;
  }
  console.log(c.red("fail") + ` ${findings.length} recommendation${findings.length === 1 ? "" : "s"}`);
  console.log(c.gray("hint: ") + "this command is read-only; review and add the missing sections by hand");
  return 1;
}

function hasHeading(text, heading) {
  // Match an exact h2 heading at line start (case-insensitive for the body
  // after "## ", so "## Vision" matches "## VISION" or "## vision" too).
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}\\b`, "im").test(text);
}

export const help = `
Usage: doctrina templates <subcommand>

Read-only inspection of the framework's templates and the current
project's adherence to recommended template shapes.

Subcommands:
  list      Enumerate the templates the installed CLI ships, with
            their relative paths and line counts.
  check     Compare the current project's AGENTS.md, product.md,
            and index.json against the recommended sections and
            schema fields shipped in this CLI version. Reports any
            recommended section that is missing. Read-only; never
            modifies any files. Exits 1 when recommendations exist,
            0 when the project follows the current template shape.
  update    Additive-only fixer for what check reports: appends
            missing recommended sections as stubs and adds missing
            index.json fields. Preview by default (exits 1 while
            updates are pending); pass --write to apply. Never
            rewrites or removes existing content.

Distinct from \`doctrina validate\`: validate answers "is this a
well-formed Doctrina tree?"; templates check answers "does this
tree still follow the shape the current CLI's templates recommend?"
`;
