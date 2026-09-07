// @ts-check
// The template-shape FINDINGS.
//
// `doctor` reports these as one of its rows and used to import them out of
// `commands/templates.js` (audit finding F7). Collecting is not rendering, so
// the collection lives here and both surfaces read it.
import path from "node:path";
import { exists, isDir, isFile, lineCount, read, relPath, walk, write } from "./fs-ops.js";
import { adapterFiles, isHubPointer, listAdapterNames } from "./adapters.js";
import { COMMAND_META, COMMAND_NAMES, SURFACE_LINE_BUDGET, surfaceBlock, surfaceMarkdown, findSurfaceBlock } from "./commands.js";
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

export function normalizeBlock(s) {
  return s.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();
}

export function hasHeading(text, heading) {
  // Match an exact h2 heading at line start (case-insensitive for the body
  // after "## ", so "## Vision" matches "## VISION" or "## vision" too).
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}\\b`, "im").test(text);
}
