// @ts-check
// The template-shape FINDINGS.
//
// `doctor` reports these as one of its rows and used to import them out of
// `commands/templates.js` (audit finding F7). Collecting is not rendering, so
// the collection lives here and both surfaces read it.
import path from "node:path";
import { exists, isDir, isFile, lineCount, read, relPath, walk, write } from "./fs-ops.js";
import { adapterFiles, isHubPointer, listAdapterNames } from "./adapters.js";
import { readTemplate } from "./templates.js";
import { PLAYBOOKS } from "./playbook.js";
import { COMMAND_META, COMMAND_NAMES, SURFACE_LINE_BUDGET, surfaceBlock, surfaceMarkdown, findSurfaceBlock } from "./commands.js";
import { declaredBudget } from "./runtime.js";
/**
 * The surface-block budget: how many lines the generated block spends, the
 * ceiling it spends them against, and what is left.
 *
 * This number is COUPLED to `agents-md-lines`: the block is written into
 * AGENTS.md, so one command added to the catalog spends a line of both.
 * Every caller that reports on it reads it HERE, so `templates check` and
 * `doctor` can never quote two different sizes for one block — the second
 * count is how the two AGENTS.md numbers drifted before change 0059, and
 * this budget had no owner at all until 0072.
 *
 * @param {string|null} [projectRoot] The project whose contract may declare
 *   the ceiling; omit to measure against the shipped default alone.
 * @returns {{ used: number, budget: number, slack: number, declared: boolean }}
 */
export function surfaceBudget(projectRoot = null) {
  const used = surfaceMarkdown().split("\n").length;
  const { value: budget, declared } = projectRoot
    ? declaredBudget(projectRoot, "surface-block-lines", SURFACE_LINE_BUDGET)
    : { value: SURFACE_LINE_BUDGET, declared: false };
  return { used, budget, slack: budget - used, declared };
}

// Recommended sections per file kind. Adopters whose files lack these
// headings get a warning from `templates check`; they are recommendations,
// not hard requirements (validate handles the hard requirements).
export const AGENTS_SECTIONS = [
  "## Stack",
  "## Commands",
  "## Repository structure",
  "## Conventions and boundaries",
  "## How to read context",
];
export const INDEX_FIELDS = ["$schema_version", "project", "artifacts"];
export const PRODUCT_SECTIONS = [
  "## Vision",
  "## Problem",
  "## Target users",
  "## Scope",
  "## Success criteria",
];

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
  const surface = surfaceBudget(projectRoot);
  if (surface.used > surface.budget) {
    findings.push({
      message: `the generated surface block is ${surface.used} lines (budget ${surface.budget}) — cut commands rather than raising the budget`,
      remedy: null,
    });
  } else {
    ok.push(`surface block within budget (${surface.used}/${surface.budget} lines)`);
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
  // The playbooks (change 0038). A playbook is the procedure the agent
  // actually executes, and since it became a template an adopter can replace
  // it — which means it can also be MISSING or malformed, and a playbook that
  // does not render is a broken session, not a cosmetic gap. Each is checked
  // for resolution and for the shape every playbook must have: a title line
  // and the ordered steps.
  for (const name of PLAYBOOKS) {
    const rel = `playbooks/${name}.md.template`;
    let body = null;
    try {
      body = readTemplate(projectRoot, rel).body;
    } catch {
      body = null;
    }
    if (body === null) {
      findings.push({
        message: `playbook "${name}" does not resolve (${rel} is missing from the project AND the installed CLI)`,
        remedy: "reinstall doctrina-cli, or restore .doctrina/templates/" + rel,
      });
      continue;
    }
    const problems = [];
    if (body.trim() === "") problems.push("it is empty");
    if (!/^\s*1\./m.test(body)) problems.push("it has no numbered first step");
    for (const [open, close] of [["[[c]]", "[[/c]]"], ["[[g]]", "[[/g]]"], ["[[b]]", "[[/b]]"], ["[[y]]", "[[/y]]"]]) {
      const opens = body.split(open).length - 1;
      const closes = body.split(close).length - 1;
      if (opens !== closes) problems.push(`${opens} ${open} spans but ${closes} ${close}`);
    }
    if (problems.length > 0) {
      findings.push({
        message: `playbook "${name}" is malformed: ${problems.join("; ")}`,
        remedy: `fix .doctrina/templates/${rel}, or delete it to fall back to the bundled playbook`,
      });
    } else {
      ok.push(`playbook: ${name}`);
    }
  }

  return { findings, ok };
}

export function normalizeBlock(s) {
  return s.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();
}

export function hasHeading(text, heading) {
  // Match an exact h2 heading at line start (case-insensitive for the body
  // after "## ", so "## Vision" matches "## VISION" or "## vision" too).
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}\\b`, "im").test(text);
}
