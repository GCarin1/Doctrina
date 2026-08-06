// @ts-check
import path from "node:path";
import process from "node:process";
import { exists, isDir, isFile, lineCount, read, relPath, walk, write } from "../lib/fs-ops.js";
import { locateTemplatesDir, listResolvedTemplates } from "../lib/templates.js";
import { adapterFiles, isHubPointer, listAdapterNames } from "../lib/adapters.js";
import {
  surfaceBlock, findSurfaceBlock, surfaceAnchors, placeSurfaceBlock,
  COMMAND_META, COMMAND_NAMES, SURFACE_LINE_BUDGET, surfaceMarkdown,
  agentChangelogBlock, findAgentChangelogBlock,
} from "../lib/commands.js";
import { cliVersion } from "../lib/version.js";
import { ARTIFACT_CATEGORIES } from "../lib/index-json.js";
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

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json", "write"], string: [] };

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

  // AGENTS.md command-surface block: the one CLI-OWNED span of the file
  // (marker-delimited, generated from the command catalog). Three cases:
  // markers present but stale -> regenerate the span; a legacy hand-written
  // "## Doctrina command surface" section without markers -> replace that
  // section with the managed block (the section was CLI-scaffolded content
  // to begin with — this is the one sanctioned exception to additive-only,
  // see ADR 0015); neither -> append the block. This is what makes
  // `doctrina upgrade --write` actually refresh AGENTS.md when the CLI
  // gains commands, instead of only bumping the stamp.
  const agentsMdPath = path.join(projectRoot, "AGENTS.md");
  if (isFile(agentsMdPath)) {
    const text = read(agentsMdPath);
    const block = findSurfaceBlock(text);
    const fresh = surfaceBlock();
    if (block) {
      if (normalizeBlock(text.slice(block.start, block.end)) !== normalizeBlock(fresh)) {
        plan.push({
          describe: ["AGENTS.md: regenerate the doctrina:surface block (stale vs installed CLI)"],
          preview: () => diffPreview(text.slice(block.start, block.end), fresh),
          apply() {
            const cur = read(agentsMdPath);
            const b = findSurfaceBlock(cur);
            if (b) write(agentsMdPath, cur.slice(0, b.start) + fresh + cur.slice(b.end), { force: true });
          },
        });
      }
    } else {
      const legacy = findLegacySurfaceSection(text);
      const anchors = templateAnchors();
      plan.push({
        describe: [legacy
          ? "AGENTS.md: replace the hand-written \"## Doctrina command surface\" section with the generated doctrina:surface block"
          : `AGENTS.md: insert the generated doctrina:surface command block${anchors.after ? ` after "${anchors.after}"` : ""} (agents discover commands through this file)`],
        preview: () => fresh,
        apply() {
          const cur = read(agentsMdPath);
          const l = findLegacySurfaceSection(cur);
          if (l) {
            // The legacy section already sits where the CLI put it, so
            // replacing it in place preserves the layout.
            write(agentsMdPath, cur.slice(0, l.start) + fresh + "\n\n" + cur.slice(l.end), { force: true });
          } else {
            // Neither block nor legacy section: PLACE it at the canonical
            // position instead of appending, so `upgrade` and `init` produce
            // the same layout (C4).
            write(agentsMdPath, placeSurfaceBlock(cur, fresh, anchors), { force: true });
          }
        },
      });
    }
  }

  // The agent-facing changelog (M2): three to six lines stating only what
  // alters agent behaviour in this version. An agent reading AGENTS.md after
  // an upgrade learns what is new without being told to look — reported from
  // real use, where a new command shipped and the driving LLM never knew.
  if (isFile(agentsMdPath)) {
    const cur = read(agentsMdPath);
    const fresh = agentChangelogBlock(cliVersion());
    const existing = findAgentChangelogBlock(cur);
    if (fresh && (!existing || normalizeBlock(cur.slice(existing.start, existing.end)) !== normalizeBlock(fresh))) {
      plan.push({
        describe: [`AGENTS.md: ${existing ? "refresh" : "add"} the "What changed in ${cliVersion()}" block for agents`],
        preview: () => fresh,
        apply() {
          const now = read(agentsMdPath);
          const found = findAgentChangelogBlock(now);
          if (found) {
            write(agentsMdPath, now.slice(0, found.start) + fresh + now.slice(found.end), { force: true });
            return;
          }
          // Place it immediately after the surface block, so "what exists"
          // and "what just changed" are read together.
          const sb = findSurfaceBlock(now);
          if (sb) {
            write(agentsMdPath, now.slice(0, sb.end) + "\n\n" + fresh + now.slice(sb.end), { force: true });
          } else {
            write(agentsMdPath, now.replace(/\s+$/, "") + "\n\n" + fresh + "\n", { force: true });
          }
        },
      });
    }
  }

  // Markdown files: append stub sections for missing recommended headings.
  /** @type {Array<[string, string[]]>} */
  const markdownTargets = [
    ["AGENTS.md", AGENTS_SECTIONS],
    [path.join(".doctrina", "product.md"), PRODUCT_SECTIONS],
  ];
  for (const [rel, sections] of markdownTargets) {
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
      const categories = ARTIFACT_CATEGORIES;
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

  for (const p of plan) {
    for (const s of p.describe) {
      console.log((writeMode ? c.green("update ") : c.yellow("would  ")) + s);
    }
    // A one-line "would append" told the operator nothing about what was
    // about to land in the file they read first. In preview, show the
    // content and where it goes (C4).
    if (!writeMode && p.preview) {
      for (const line of p.preview().split("\n")) console.log(c.gray("       │ ") + line);
    }
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
  // Resolution is a CHAIN (M1): a template under the project's
  // `.doctrina/templates/` wins over the bundled copy, per file. Printing
  // WHERE each one resolved from is what turns the override from a hidden
  // behaviour into a usable one.
  const projectRoot = process.cwd();
  const rows = listResolvedTemplates(isDir(path.join(projectRoot, ".doctrina")) ? projectRoot : null);
  if (rows.length === 0) {
    console.error(c.red("error:") + " no templates found");
    return 1;
  }

  console.log(c.bold("Templates resolved for this project:"));
  console.log("");
  const width = Math.max(...rows.map((r) => r.relativePath.length));
  for (const r of rows) {
    const source = r.source === "project"
      ? c.cyan("project") + (r.overrides ? c.gray(" (overrides bundled)") : "")
      : c.gray("bundled");
    console.log(`  ${r.relativePath.padEnd(width + 2)}${String(lineCount(r.path)).padStart(4)} lines  ${source}`);
  }
  console.log("");
  const overridden = rows.filter((r) => r.source === "project").length;
  console.log(c.gray(`${rows.length} templates · ${overridden} from this project's .doctrina/templates/`));
  if (overridden === 0) {
    console.log(c.gray("Drop a file there with the same relative path to override one — see docs/en/templates.md."));
  }
  return 0;
}

function checkTemplates() {
  const projectRoot = process.cwd();
  if (!isDir(path.join(projectRoot, ".doctrina"))) {
    console.error(c.red("error:") + " not a Doctrina project (no .doctrina/ in cwd)");
    console.error(c.gray("hint: ") + "run `doctrina init` first");
    return 1;
  }
  const { findings, ok } = collectFindings(projectRoot);

  return report(findings, ok);
}

// The findings `templates check` reports, as structured records with an
// executable remedy. Exported so a test can seed each finding, run the
// remedy it names, and assert the finding clears — a remedy that cannot
// resolve its own finding is not a remedy (C2).
export function collectFindings(projectRoot) {
  const findings = [];
  const ok = [];

  // AGENTS.md sections
  const agentsPath = path.join(projectRoot, "AGENTS.md");
  if (isFile(agentsPath)) {
    const text = read(agentsPath);
    for (const heading of AGENTS_SECTIONS) {
      if (hasHeading(text, heading)) ok.push(`AGENTS.md: ${heading}`);
      else findings.push({ message: `AGENTS.md missing recommended section "${heading}"`, remedy: "doctrina templates update --write" });
    }
    // Command-surface block: present and current vs the installed catalog.
    const block = findSurfaceBlock(text);
    if (!block) {
      findings.push({ message: "AGENTS.md has no doctrina:surface block — agents discover commands through this file", remedy: "doctrina templates update --write" });
    } else if (normalizeBlock(text.slice(block.start, block.end)) !== normalizeBlock(surfaceBlock())) {
      findings.push({ message: "AGENTS.md doctrina:surface block is stale vs the installed CLI", remedy: "doctrina templates update --write" });
    } else {
      ok.push("AGENTS.md: doctrina:surface block current");
    }
  } else {
    findings.push({ message: "AGENTS.md missing at project root", remedy: "doctrina init --force" });
  }

  // product.md sections
  const productPath = path.join(projectRoot, ".doctrina", "product.md");
  if (isFile(productPath)) {
    const text = read(productPath);
    for (const heading of PRODUCT_SECTIONS) {
      if (hasHeading(text, heading)) ok.push(`product.md: ${heading}`);
      else findings.push({ message: `.doctrina/product.md missing recommended section "${heading}"`, remedy: "doctrina templates update --write" });
    }
  } else {
    findings.push({ message: ".doctrina/product.md missing", remedy: "doctrina init --force" });
  }

  // Installed agent adapters: a HUB POINTER file must still reference
  // AGENTS.md (that is why one `upgrade --write` refresh of the hub reaches
  // every installed agent). Only files whose template declares the
  // {{AGENTS_MD_PATH}} token are pointers; a slash-command shim reaches the
  // hub through its parent pointer file and is not checked (C2).
  for (const name of listAdapterNames(projectRoot)) {
    const spec = adapterFiles(projectRoot, name);
    if (!spec) continue;
    for (const file of spec.files) {
      const installed = path.join(projectRoot, file.relativePath);
      if (!isFile(installed)) continue; // not installed — nothing to check
      if (!isHubPointer(file)) continue; // command shim, not a pointer
      if (read(installed).includes("AGENTS.md")) {
        ok.push(`adapter ${file.relativePath}: points at AGENTS.md`);
      } else {
        findings.push({
          message: `adapter ${file.relativePath} no longer references AGENTS.md — agents loading it will miss the hub`,
          // Executable and verified: `adapter add --force` rewrites exactly
          // this file from its template. A remedy that cannot resolve the
          // finding it is attached to is not a remedy (C2).
          remedy: `doctrina adapter add ${name} --force`,
        });
      }
    }
  }

  // M2: a command that cannot state its trigger has not earned a place on
  // the surface. The block is an agent's only discovery surface, so both
  // fields are required and the block has a declared size budget.
  for (const name of COMMAND_NAMES) {
    const meta = COMMAND_META[name];
    if (!meta || !meta.purpose || !meta.when) {
      findings.push({
        message: `command "${name}" declares no ${!meta ? "purpose or when" : (!meta.purpose ? "purpose" : "when")} — the surface block cannot say when to reach for it`,
        remedy: null,
      });
    }
  }
  const surfaceLines = surfaceMarkdown().split("\n").length;
  if (surfaceLines > SURFACE_LINE_BUDGET) {
    findings.push({
      message: `the generated surface block is ${surfaceLines} lines (budget ${SURFACE_LINE_BUDGET}) — cut commands rather than raising the budget`,
      remedy: null,
    });
  } else {
    ok.push(`surface block within budget (${surfaceLines}/${SURFACE_LINE_BUDGET} lines)`);
  }

  // index.json schema fields
  const indexPath = path.join(projectRoot, ".doctrina", "index.json");
  if (isFile(indexPath)) {
    try {
      const idx = JSON.parse(read(indexPath));
      for (const field of INDEX_FIELDS) {
        if (idx[field] !== undefined) ok.push(`index.json: ${field}`);
        else findings.push({ message: `.doctrina/index.json missing field "${field}"`, remedy: "doctrina templates update --write" });
      }
      if (idx.$schema_version && idx.$schema_version !== "0.1.0") {
        findings.push({ message: `.doctrina/index.json $schema_version is "${idx.$schema_version}" (expected "0.1.0")`, remedy: null });
      }
    } catch (err) {
      findings.push({ message: `.doctrina/index.json failed to parse: ${err.message}`, remedy: null });
    }
  } else {
    findings.push({ message: ".doctrina/index.json missing", remedy: "doctrina index rebuild" });
  }

  // Output
  return { findings, ok };
}

function report(findings, ok) {
  for (const o of ok) console.log(c.green("✓ ") + o);
  for (const f of findings) {
    console.log(c.yellow("✗ ") + f.message);
    // Every finding names the command that RESOLVES it, or says plainly
    // that repair is manual. A remedy the CLI cannot execute and verify is
    // not a remedy — a test runs each one and asserts the finding clears.
    console.log(c.gray("    fix: ") + (f.remedy ? c.cyan(f.remedy) : c.gray("manual repair — no command can fix this")));
  }
  console.log("");

  if (findings.length === 0) {
    console.log(c.green("ok") + " all recommended sections present");
    return 0;
  }
  console.log(c.red("fail") + ` ${findings.length} recommendation${findings.length === 1 ? "" : "s"}`);
  return 1;
}

// Line-level preview of what regenerating the block changes: only the
// lines that differ, so a stale-catalog refresh reads as the two or three
// commands that moved rather than as twenty unchanged lines.
function diffPreview(before, after) {
  const a = before.split("\n");
  const b = after.split("\n");
  const aSet = new Set(a);
  const bSet = new Set(b);
  const out = [
    ...a.filter((line) => !bSet.has(line)).map((line) => `- ${line}`),
    ...b.filter((line) => !aSet.has(line)).map((line) => `+ ${line}`),
  ];
  return out.length > 0 ? out.join("\n") : "(no textual change)";
}

// Whitespace/EOL-insensitive comparison for the surface block, so a CRLF
// checkout is not eternally "stale".

// The canonical position, read from the shipped template — the single
// place the intended layout is defined.
function templateAnchors() {
  try {
    return surfaceAnchors(read(path.join(locateTemplatesDir(), "AGENTS.md.template")));
  } catch {
    return { after: null, before: null };
  }
}

function normalizeBlock(s) {
  return s.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();
}

// A pre-marker AGENTS.md's hand-written surface section: from the
// "## Doctrina command surface" heading up to (excluding) the next "## "
// heading. The trailing "Continuous: ..." paragraph the old template put
// after the bullets belongs to the section body, so it is replaced too.
function findLegacySurfaceSection(text) {
  const head = text.match(/^##\s+Doctrina command surface.*$/m);
  if (!head) return null;
  const after = text.slice(head.index + head[0].length);
  const next = after.match(/^##\s+/m);
  return { start: head.index, end: next ? head.index + head[0].length + next.index : text.length };
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
            schema fields shipped in this CLI version — including
            whether the AGENTS.md doctrina:surface block (the
            CLI-owned, generated command catalog) is present and
            current. Read-only; never modifies any files. Exits 1
            when recommendations exist, 0 otherwise.
  update    Fixer for what check reports: appends missing
            recommended sections as stubs, adds missing index.json
            fields, and regenerates the AGENTS.md doctrina:surface
            block from the installed command catalog. Preview by
            default (exits 1 while updates are pending); pass
            --write to apply. Additive-only outside the surface
            block: the marker-delimited span is the one CLI-owned
            region it rewrites (ADR 0015); your content is never
            touched.

Distinct from \`doctrina validate\`: validate answers "is this a
well-formed Doctrina tree?"; templates check answers "does this
tree still follow the shape the current CLI's templates recommend?"
`;
