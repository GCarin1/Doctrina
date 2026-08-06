import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { exists } from "../lib/fs-ops.js";
import { collectStatus } from "./status.js";
import { collectFindings } from "./templates.js";
import { c } from "../lib/colors.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";

// Aggregate diagnostic: the one command to run when "something looks wrong"
// and you do not know which gate to ask. It sequences the existing checks —
// validate, index drift, clean-checkout lint, template shape — and reports
// each with its exact remediation command. A DRIVER over existing commands
// (like `close`): it adds no checks of its own, so it can never disagree
// with the authoritative gates it fronts.

const cliEntry = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "index.js");

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: [], string: [] };

export async function run(_positional, _flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }

  console.log(c.bold("Doctrina doctor") + c.gray(" — aggregate diagnostic (read-only):"));
  console.log("");

  let failures = 0;
  let warningsTotal = 0;
  const row = (state, name, detail, fix) => {
    const mark = state === "ok" ? c.green("ok  ") : state === "warn" ? c.yellow("warn") : c.red("FAIL");
    console.log(`  ${mark}  ${name.padEnd(16)} ${detail}`);
    if (fix) console.log(`        ${" ".repeat(16)} ${c.gray(`fix: ${fix}`)}`);
    if (state === "fail") failures += 1;
  };

  // 1. Structural gate (validate), machine-read so the counts are exact.
  const v = runSelf(["validate", "--json"], projectRoot);
  let vParsed = null;
  try {
    vParsed = JSON.parse(v.stdout);
  } catch {
    vParsed = null;
  }
  if (!vParsed) {
    row("fail", "validate", "did not produce a report", "doctrina validate");
  } else if (!vParsed.ok) {
    row("fail", "validate", `${vParsed.errors.length} error${vParsed.errors.length === 1 ? "" : "s"}, ${vParsed.warnings.length} warning${vParsed.warnings.length === 1 ? "" : "s"}`, "doctrina validate  (then `doctrina validate --fix` for index drift)");
    for (const e of vParsed.errors.slice(0, 3)) console.log(`        ${" ".repeat(16)} ${c.red("·")} ${e}`);
  } else if (vParsed.warnings.length > 0) {
    warningsTotal += vParsed.warnings.length;
    row("warn", "validate", `0 errors, ${vParsed.warnings.length} warning${vParsed.warnings.length === 1 ? "" : "s"}`, "doctrina validate  (warnings listed there)");
  } else {
    row("ok", "validate", "all structural checks pass");
  }

  // 2. Index ↔ tree drift.
  const drift = runSelf(["index", "rebuild", "--check"], projectRoot);
  if (drift.status === 0) row("ok", "index", "index.json matches the tree");
  else row("fail", "index", "index.json has drifted from the tree", "doctrina validate --fix   (or `doctrina index rebuild`)");

  // 3. Evidence and provenance ratios (cheap summaries; strict gates confirm).
  const s = collectStatus(projectRoot);
  if (s.coverage.totalCriteria === 0) {
    row("warn", "coverage", "no acceptance criteria declared yet", "write criteria with evidence — see `doctrina coverage`");
    warningsTotal += 1;
  } else if (s.coverage.pct === 100 && s.coverage.totalDangling === 0 && s.coverage.totalConditional === 0) {
    row("ok", "coverage", `${s.coverage.pct}% (${s.coverage.totalCovered}/${s.coverage.totalCriteria} criteria)`);
  } else {
    row("warn", "coverage", `${s.coverage.pct}% (${s.coverage.totalCovered}/${s.coverage.totalCriteria}${s.coverage.totalDangling ? `, ${s.coverage.totalDangling} dangling` : ""}${s.coverage.totalConditional ? `, ${s.coverage.totalConditional} conditional` : ""})`, "doctrina coverage   (cite the missing evidence)");
    warningsTotal += 1;
  }
  if (s.trace.anchors === 0) {
    row("warn", "trace", "no intent anchors declared in product.md", "tag bullets `- [SC1] ...`, add `**Realizes:**` to specs");
    warningsTotal += 1;
  } else if (s.trace.realized === s.trace.anchors && s.trace.untraceable === 0 && s.trace.dangling === 0) {
    row("ok", "trace", `${s.trace.realized}/${s.trace.anchors} anchors realized`);
  } else {
    row("warn", "trace", `${s.trace.realized}/${s.trace.anchors} realized, ${s.trace.dropped} dropped, ${s.trace.untraceable} untraceable`, "doctrina trace");
    warningsTotal += 1;
  }

  // 4. Clean-checkout reproducibility lint (ADR 0008).
  const clean = runSelf(["verify", "--clean"], projectRoot);
  if (clean.status === 0) row("ok", "clean-checkout", "no reproducibility footguns detected");
  else row("fail", "clean-checkout", "a fresh clone would not build/run as-is", "doctrina verify --clean   (fix the listed package.json footguns)");

  // 5. Template shape vs the running CLI's recommendation. The row reports
  //    the ACTUAL findings and the remedy each one names, rather than
  //    assuming every failure is a missing section — an adapter pointer
  //    break was reported as "recommended sections/fields are missing" and
  //    sent the user to `templates update`, which does not touch adapters
  //    and so could never clear it (C2).
  {
    let tmplFindings = [];
    try {
      tmplFindings = collectFindings(projectRoot).findings;
    } catch {
      tmplFindings = [];
    }
    if (tmplFindings.length === 0) {
      row("ok", "templates", "project follows the current template shape");
    } else {
      // Group by remedy so the row names what actually fixes what.
      const byRemedy = new Map();
      for (const f of tmplFindings) {
        const key = f.remedy ?? "(manual repair)";
        byRemedy.set(key, (byRemedy.get(key) ?? 0) + 1);
      }
      const summary = tmplFindings.length === 1
        ? tmplFindings[0].message
        : `${tmplFindings.length} template findings`;
      const remedy = [...byRemedy.keys()].filter((k) => k !== "(manual repair)");
      row("warn", "templates", summary, remedy.length === 1 ? remedy[0] : "doctrina templates check   (each finding names its own fix)");
      warningsTotal += 1;
    }
  }

  // 6. Verify configuration (the real build gate must exist to be run).
  if (s.verify.invalid) row("fail", "verify config", ".doctrina/verify.json is invalid JSON", "fix the JSON, then `doctrina verify`");
  else if (!s.verify.configured) {
    row("warn", "verify config", "no verify.json — the build gate is undeclared", "doctrina verify --init");
    warningsTotal += 1;
  } else {
    row("ok", "verify config", `${s.verify.checks} check${s.verify.checks === 1 ? "" : "s"} declared (run \`doctrina verify\` to execute)`);
  }

  console.log("");
  if (failures > 0) {
    console.log(c.red("fail") + ` ${failures} failing area${failures === 1 ? "" : "s"} — fix commands above, then re-run \`doctrina doctor\``);
    return 1;
  }
  if (warningsTotal > 0) {
    console.log(c.yellow("warn") + ` no failures; ${warningsTotal} advisory item${warningsTotal === 1 ? "" : "s"} above`);
    return 0;
  }
  console.log(c.green("ok") + " every diagnostic is green — `doctrina verify` remains the build gate to execute");
  return 0;
}

function runSelf(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
}

export const help = `
Usage: doctrina doctor

Aggregate diagnostic: run the structural gate (validate), the index
drift check, the coverage/trace ratios, the clean-checkout lint
(verify --clean), the template-shape check, and the verify-config
presence — each reported with its exact remediation command.

A driver over the existing commands; it adds no checks of its own.
Read-only. Exits 1 when any area fails, 0 otherwise (warnings allowed).
`;
