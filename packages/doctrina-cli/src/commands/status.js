import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read, walk } from "../lib/fs-ops.js";
import * as idx from "../lib/index-json.js";
import { deriveIndex, indexesMatch, specHeader, listHeader } from "../lib/scan.js";
import { cliVersion } from "../lib/version.js";
import { summarize as coverageSummary } from "./coverage.js";
import { summarize as traceSummary } from "./trace.js";
import { c } from "../lib/colors.js";

// One-glance project health (review 2026-06-27 passive-user feature #1): a
// dashboard that answers "where do things stand?" in a single read, so neither
// the human nor the agent has to run validate + coverage + trace + next
// separately. Strictly read-only; never mutates and always exits 0. It reports
// the gate signals it can compute cheaply (index drift, the framework stamp,
// coverage/trace ratios, whether verify is configured) and the artifact counts;
// `doctrina validate` / `verify` remain the full, authoritative gates.

const CONFIG_REL = ".doctrina/verify.json";

export async function run(_positional, _flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }

  let index = null;
  try {
    index = idx.load(projectRoot);
  } catch {
    index = null;
  }

  const project = index?.project ?? path.basename(projectRoot);
  const stamp = index?.framework_version ?? "—";
  const cli = cliVersion();
  console.log(c.bold("Doctrina status") + c.gray(` — ${project}  (framework ${stamp} / CLI ${cli})`));
  console.log("");

  // --- Gates ---
  console.log(c.bold("  Gates"));
  // Index drift (the silent rot validate now errors on).
  let driftLine;
  if (!index) {
    driftLine = c.red("missing/unreadable") + c.gray(" — run `doctrina index rebuild`");
  } else if (indexesMatch(deriveIndex(projectRoot, index), index)) {
    driftLine = c.green("in sync");
  } else {
    driftLine = c.yellow("drifted") + c.gray(" — run `doctrina validate --fix`");
  }
  console.log(`    ${"index".padEnd(11)} ${driftLine}`);

  // Framework stamp divergence.
  const stampLine = stamp === cli
    ? c.green("current")
    : c.yellow(`${stamp} (CLI ${cli})`) + c.gray(" — `doctrina index rebuild`");
  console.log(`    ${"stamp".padEnd(11)} ${stampLine}`);

  // Coverage and trace ratios.
  const cov = coverageSummary(projectRoot);
  const covExtra = cov.totalDangling + cov.totalConditional > 0
    ? c.yellow(` ${cov.totalDangling} dangling, ${cov.totalConditional} conditional`)
    : "";
  const covColor = cov.pct === 100 ? c.green : cov.pct >= 50 ? c.yellow : c.red;
  console.log(`    ${"coverage".padEnd(11)} ${covColor(`${cov.pct}%`)} ${c.gray(`(${cov.totalCovered}/${cov.totalCriteria} criteria)`)}${covExtra}`);

  const tr = traceSummary(projectRoot);
  const trExtra = tr.untraceable + tr.dropped + tr.dangling > 0
    ? c.yellow(` ${tr.dropped} dropped, ${tr.untraceable} untraceable`)
    : "";
  const trColor = tr.anchors === 0 ? c.gray : (tr.realized === tr.anchors && tr.untraceable === 0 ? c.green : c.yellow);
  const trText = tr.anchors === 0 ? "no anchors" : `${tr.realized}/${tr.anchors} anchors`;
  console.log(`    ${"trace".padEnd(11)} ${trColor(trText)}${trExtra}`);

  // Verify config presence (running it is the slow, authoritative gate).
  const verifyCfg = path.join(projectRoot, CONFIG_REL);
  let verifyLine = c.gray("not configured") + c.gray(" — `doctrina verify --init`");
  if (isFile(verifyCfg)) {
    try {
      const cfg = JSON.parse(read(verifyCfg));
      const n = Array.isArray(cfg?.checks) ? cfg.checks.length : 0;
      verifyLine = c.cyan(`${n} check${n === 1 ? "" : "s"}`) + c.gray(" — run `doctrina verify`");
    } catch {
      verifyLine = c.red("invalid JSON");
    }
  }
  console.log(`    ${"verify".padEnd(11)} ${verifyLine}`);

  // --- Work ---
  console.log("");
  console.log(c.bold("  Work"));
  const specs = countSpecs(projectRoot);
  const implBreak = Object.entries(specs.impl).map(([k, v]) => `${v} ${k}`).join(", ");
  console.log(`    ${"specs".padEnd(11)} ${specs.total}${implBreak ? c.gray(`  (${implBreak})`) : ""}`);
  console.log(`    ${"changes".padEnd(11)} ${specs.openChanges} open`);
  const adr = countDecisions(projectRoot);
  const adrNotes = [];
  if (adr.proposed > 0) adrNotes.push(c.yellow(`${adr.proposed} proposed`));
  if (adr.bare > 0) adrNotes.push(c.yellow(`${adr.bare} unproven`));
  console.log(`    ${"decisions".padEnd(11)} ${adr.total}${adrNotes.length ? c.gray("  (") + adrNotes.join(c.gray(", ")) + c.gray(")") : ""}`);
  const skills = countSkills(projectRoot);
  console.log(`    ${"skills".padEnd(11)} ${skills}`);

  console.log("");
  console.log(c.gray("  Full gates: `doctrina validate` · `doctrina verify`.  Next step: `doctrina next`."));
  return 0;
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
Usage: doctrina status

Print a one-glance health dashboard for the .doctrina/ project: the gate
signals (index drift, framework stamp, coverage %, trace anchors, whether
verify is configured) and the artifact counts (specs by implementation
state, open changes, decisions, skills). Read-only; always exits 0.

It is a fast summary, not the authoritative gate: run \`doctrina validate\`
and \`doctrina verify\` for the full structural and build checks, and
\`doctrina next\` for the recommended next action.
`;
