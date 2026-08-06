import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read, walk } from "../lib/fs-ops.js";
import * as idx from "../lib/index-json.js";
import { deriveIndex, indexesMatch, specHeader, listHeader } from "../lib/scan.js";
import { cliVersion } from "../lib/version.js";
import { summarize as coverageSummary } from "./coverage.js";
import { summarize as traceSummary } from "./trace.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";

// One-glance project health (review 2026-06-27 passive-user feature #1): a
// dashboard that answers "where do things stand?" in a single read, so neither
// the human nor the agent has to run validate + coverage + trace + next
// separately. Strictly read-only; never mutates and always exits 0. It reports
// the gate signals it can compute cheaply (index drift, the framework stamp,
// coverage/trace ratios, whether verify is configured) and the artifact counts;
// `doctrina validate` / `verify` remain the full, authoritative gates.

const CONFIG_REL = ".doctrina/verify.json";

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json"], string: [] };

export async function run(_positional, flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }

  const s = collectStatus(projectRoot);

  if (flagBool(flags, "json", false)) {
    console.log(JSON.stringify(s, null, 2));
    return 0;
  }

  console.log(c.bold("Doctrina status") + c.gray(` — ${s.project}  (framework ${s.stamp ?? "—"} / CLI ${s.cli})`));
  console.log("");

  // --- Gates ---
  console.log(c.bold("  Gates"));
  let driftLine;
  if (s.indexState === "missing") {
    driftLine = c.red("missing/unreadable") + c.gray(" — run `doctrina index rebuild`");
  } else if (s.indexState === "in-sync") {
    driftLine = c.green("in sync");
  } else {
    driftLine = c.yellow("drifted") + c.gray(" — run `doctrina validate --fix`");
  }
  console.log(`    ${"index".padEnd(11)} ${driftLine}`);

  const stampLine = s.stamp === s.cli
    ? c.green("current")
    : c.yellow(`${s.stamp ?? "—"} (CLI ${s.cli})`) + c.gray(" — `doctrina index rebuild`");
  console.log(`    ${"stamp".padEnd(11)} ${stampLine}`);

  const cov = s.coverage;
  const covExtra = cov.totalDangling + cov.totalConditional > 0
    ? c.yellow(` ${cov.totalDangling} dangling, ${cov.totalConditional} conditional`)
    : "";
  const covColor = cov.pct === 100 ? c.green : cov.pct >= 50 ? c.yellow : c.red;
  console.log(`    ${"coverage".padEnd(11)} ${covColor(`${cov.pct}%`)} ${c.gray(`(${cov.totalCovered}/${cov.totalCriteria} criteria)`)}${covExtra}`);

  const tr = s.trace;
  const trExtra = tr.untraceable + tr.dropped + tr.dangling > 0
    ? c.yellow(` ${tr.dropped} dropped, ${tr.untraceable} untraceable`)
    : "";
  const trColor = tr.anchors === 0 ? c.gray : (tr.realized === tr.anchors && tr.untraceable === 0 ? c.green : c.yellow);
  const trText = tr.anchors === 0 ? "no anchors" : `${tr.realized}/${tr.anchors} anchors`;
  console.log(`    ${"trace".padEnd(11)} ${trColor(trText)}${trExtra}`);

  let verifyLine = c.gray("not configured") + c.gray(" — `doctrina verify --init`");
  if (s.verify.invalid) {
    verifyLine = c.red("invalid JSON");
  } else if (s.verify.configured) {
    const n = s.verify.checks;
    verifyLine = c.cyan(`${n} check${n === 1 ? "" : "s"}`) + c.gray(" — run `doctrina verify`");
  }
  console.log(`    ${"verify".padEnd(11)} ${verifyLine}`);

  // --- Work ---
  console.log("");
  console.log(c.bold("  Work"));
  const implBreak = Object.entries(s.specs.impl).map(([k, v]) => `${v} ${k}`).join(", ");
  console.log(`    ${"specs".padEnd(11)} ${s.specs.total}${implBreak ? c.gray(`  (${implBreak})`) : ""}`);
  console.log(`    ${"changes".padEnd(11)} ${s.specs.openChanges} open`);
  const adrNotes = [];
  if (s.decisions.proposed > 0) adrNotes.push(c.yellow(`${s.decisions.proposed} proposed`));
  if (s.decisions.bare > 0) adrNotes.push(c.yellow(`${s.decisions.bare} unproven`));
  console.log(`    ${"decisions".padEnd(11)} ${s.decisions.total}${adrNotes.length ? c.gray("  (") + adrNotes.join(c.gray(", ")) + c.gray(")") : ""}`);
  console.log(`    ${"skills".padEnd(11)} ${s.skills}`);

  console.log("");
  console.log(c.gray("  Full gates: `doctrina validate` · `doctrina verify`.  Next step: `doctrina next`."));
  return 0;
}

// Pure, render-free status snapshot — the data behind the dashboard, shared
// with `prime`, `handoff`, `doctor`, and the `--json` output so every consumer
// reads the same numbers.
export function collectStatus(projectRoot) {
  let index = null;
  try {
    index = idx.load(projectRoot);
  } catch {
    index = null;
  }
  let indexState = "missing";
  if (index) {
    indexState = indexesMatch(deriveIndex(projectRoot, index), index) ? "in-sync" : "drifted";
  }

  const verifyCfg = path.join(projectRoot, CONFIG_REL);
  let verify = { configured: false, checks: 0, invalid: false };
  if (isFile(verifyCfg)) {
    try {
      const cfg = JSON.parse(read(verifyCfg));
      verify = { configured: true, checks: Array.isArray(cfg?.checks) ? cfg.checks.length : 0, invalid: false };
    } catch {
      verify = { configured: true, checks: 0, invalid: true };
    }
  }

  return {
    project: index?.project ?? path.basename(projectRoot),
    stamp: index?.framework_version ?? null,
    cli: cliVersion(),
    indexState,
    coverage: coverageSummary(projectRoot),
    trace: traceSummary(projectRoot),
    verify,
    specs: countSpecs(projectRoot),
    decisions: countDecisions(projectRoot),
    skills: countSkills(projectRoot),
  };
}

function countSpecs(projectRoot) {
  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  const impl = {};
  let total = 0;
  if (isDir(specsDir)) {
    for (const cap of readdirSync(specsDir).sort()) {
      const p = path.join(specsDir, cap, "spec.md");
      if (!isFile(p)) continue;
      total += 1;
      const implRaw = specHeader(read(p), "Implementation");
      if (implRaw) {
        const word = implRaw.trim().split(/[\s—-]+/)[0].toLowerCase();
        impl[word] = (impl[word] ?? 0) + 1;
      }
    }
  }
  const changesDir = path.join(projectRoot, ".doctrina", "changes");
  let openChanges = 0;
  if (isDir(changesDir)) {
    for (const e of readdirSync(changesDir)) {
      if (e === "archive" || e.startsWith(".")) continue;
      if (isDir(path.join(changesDir, e))) openChanges += 1;
    }
  }
  return { total, impl, openChanges };
}

function countDecisions(projectRoot) {
  const adrDir = path.join(projectRoot, ".doctrina", "decisions");
  let total = 0, proposed = 0, bare = 0;
  const isBare = (v) => {
    const t = (v ?? "").trim();
    return t === "" || t === "—" || t === "-";
  };
  if (isDir(adrDir)) {
    for (const f of walk(adrDir)) {
      if (!/^\d{4}-.+\.md$/.test(path.basename(f))) continue;
      total += 1;
      const text = read(f);
      const status = (listHeader(text, "Status") ?? "").toLowerCase();
      if (status === "proposed") proposed += 1;
      if (status === "accepted") {
        const evidence = listHeader(text, "Evidence");
        const landed = listHeader(text, "Landed");
        if (evidence !== null && isBare(evidence) && isBare(landed)) bare += 1;
      }
    }
  }
  return { total, proposed, bare };
}

function countSkills(projectRoot) {
  const skillsDir = path.join(projectRoot, ".doctrina", "skills");
  if (!isDir(skillsDir)) return 0;
  return walk(skillsDir).filter((f) => f.endsWith(".md")).length;
}

export const help = `
Usage: doctrina status [--json]

Print a one-glance health dashboard for the .doctrina/ project: the gate
signals (index drift, framework stamp, coverage %, trace anchors, whether
verify is configured) and the artifact counts (specs by implementation
state, open changes, decisions, skills). Read-only; always exits 0.

Flags:
  --json   Emit the snapshot as JSON (stable shape for agents and CI).

It is a fast summary, not the authoritative gate: run \`doctrina validate\`
and \`doctrina verify\` for the full structural and build checks, and
\`doctrina next\` for the recommended next action.
`;
