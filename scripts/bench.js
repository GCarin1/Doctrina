#!/usr/bin/env node
// Doctrina benchmark — synthetic projects of three sizes, timing
// validate / analyze / clarify. Zero deps; only node: stdlib.
//
// Usage:
//   node scripts/bench.js [--iterations N]

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const cli = path.join(repoRoot, "packages", "doctrina-cli", "src", "index.js");

// Parse --iterations N (default 5)
let iterations = 5;
for (let i = 2; i < process.argv.length - 1; i++) {
  if (process.argv[i] === "--iterations") {
    iterations = parseInt(process.argv[i + 1], 10) || 5;
  }
}

const SIZES = {
  small: { specs: 1, adrs: 1, changes_archived: 1 },
  medium: { specs: 10, adrs: 5, changes_archived: 10 },
  large: { specs: 50, adrs: 20, changes_archived: 50 },
};

function generateProject(root, size) {
  mkdirSync(root, { recursive: true });
  // AGENTS.md
  writeFileSync(
    path.join(root, "AGENTS.md"),
    "# AGENTS.md\n\n## Stack\n\nNode.js\n\n## Commands\n\n```\nnpm test\n```\n",
  );
  // .doctrina dirs
  for (const dir of ["specs", "decisions", "changes/archive"]) {
    mkdirSync(path.join(root, ".doctrina", dir), { recursive: true });
  }
  // product.md
  writeFileSync(
    path.join(root, ".doctrina", "product.md"),
    "# Product\n\n## Vision\n\nSynthetic.\n\n## Scope\n\nIn scope.\n",
  );
  // Specs
  const specsArr = [];
  for (let i = 0; i < size.specs; i++) {
    const cap = `cap-${String(i).padStart(3, "0")}`;
    mkdirSync(path.join(root, ".doctrina", "specs", cap), { recursive: true });
    writeFileSync(
      path.join(root, ".doctrina", "specs", cap, "spec.md"),
      `# Spec — ${cap}\n\n**Capability:** ${cap}\n**Status:** active\n\n## Purpose\n\nSynthetic.\n\n## Requirements (EARS)\n\n### Ubiquitous\n\n- The system shall do thing ${i}.\n\n## Acceptance criteria\n\n1. Returns OK.\n`,
    );
    specsArr.push({
      id: cap,
      path: `.doctrina/specs/${cap}/spec.md`,
      status: "active",
      version: "0.1.0",
      last_updated: "2026-06-04",
    });
  }
  // ADRs
  const adrsArr = [];
  for (let i = 1; i <= size.adrs; i++) {
    const id = String(i).padStart(4, "0");
    const filename = `${id}-decision-${i}.md`;
    writeFileSync(
      path.join(root, ".doctrina", "decisions", filename),
      `# ADR ${id} — Decision ${i}\n\n- **Status:** accepted\n- **Date:** 2026-06-04\n\n## Context\n\nSynthetic.\n\n## Decision\n\nDo X.\n\n## Consequences\n\n**Positive**\n\n- Fine.\n`,
    );
    adrsArr.push({
      id,
      path: `.doctrina/decisions/${filename}`,
      title: `Decision ${i}`,
      status: "accepted",
      date: "2026-06-04",
    });
  }
  // Archived changes
  const archArr = [];
  for (let i = 1; i <= size.changes_archived; i++) {
    const id = String(i).padStart(4, "0");
    const folder = `2026-06-04-${id}-change-${i}`;
    const folderPath = path.join(root, ".doctrina", "changes", "archive", folder);
    mkdirSync(folderPath, { recursive: true });
    writeFileSync(path.join(folderPath, "proposal.md"), `# Change ${id}\n\n- **Status:** applied\n- **Date:** 2026-06-04\n\n## Why\n\nReason.\n`);
    writeFileSync(path.join(folderPath, "tasks.md"), "# Tasks\n\n- [x] Done.\n");
    archArr.push({
      id,
      title: `Change ${i}`,
      path: `.doctrina/changes/archive/${folder}`,
      status: "applied",
      applied: "2026-06-04",
      specs_affected: [],
    });
  }
  // index.json
  writeFileSync(
    path.join(root, ".doctrina", "index.json"),
    JSON.stringify({
      $schema_version: "0.1.0",
      project: "bench",
      framework_version: "0.1.0",
      last_updated: "2026-06-04",
      artifacts: {
        product: { path: ".doctrina/product.md", status: "active", version: "0.1.0", last_updated: "2026-06-04" },
        specs: specsArr,
        decisions: adrsArr,
        changes: [],
        changes_archive: archArr,
      },
    }, null, 2) + "\n",
  );
}

function time(fn) {
  const t0 = performance.now();
  fn();
  return performance.now() - t0;
}

function run(command, cwd) {
  const r = spawnSync("node", [cli, ...command], { cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
  if (r.status !== 0) {
    throw new Error(`command ${command.join(" ")} exited ${r.status}: ${r.stderr}`);
  }
}

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function fmt(ms) {
  return `${ms.toFixed(1)}ms`;
}

console.log(`Doctrina bench — ${iterations} iterations per size`);
console.log("");
console.log("size     specs  ADRs  archived  validate  analyze*  clarify**");
console.log("-------  -----  ----  --------  --------  --------  ---------");

for (const [name, size] of Object.entries(SIZES)) {
  const root = mkdtempSync(path.join(tmpdir(), `doctrina-bench-${name}-`));
  try {
    generateProject(root, size);
    const validateTimes = [];
    const analyzeTimes = [];
    const clarifyTimes = [];
    for (let i = 0; i < iterations; i++) {
      validateTimes.push(time(() => run(["validate"], root)));
      // No active change to analyze — substitute a clarify on a spec for parity.
      const specPath = path.join(".doctrina", "specs", "cap-000", "spec.md");
      clarifyTimes.push(time(() => {
        const r = spawnSync("node", [cli, "clarify", specPath], { cwd: root, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
        // clarify exits 1 if smells found; both 0 and 1 are valid.
        if (r.status !== 0 && r.status !== 1) throw new Error("clarify failed");
      }));
    }
    console.log(
      `${name.padEnd(7)}  ${String(size.specs).padStart(5)}  ${String(size.adrs).padStart(4)}  ${String(size.changes_archived).padStart(8)}  ${fmt(median(validateTimes)).padStart(8)}  ${"n/a".padStart(8)}  ${fmt(median(clarifyTimes)).padStart(9)}`,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

console.log("");
console.log("*  analyze requires an open change folder; skipped in synthetic benches.");
console.log("** clarify timing is per single-spec invocation.");
console.log("");
console.log("Numbers are medians across iterations on a single host. Synthetic;");
console.log("not a substitute for measuring against your own repository.");
