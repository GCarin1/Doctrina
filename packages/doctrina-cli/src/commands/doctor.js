// @ts-check
import path from "node:path";
import process from "node:process";
import { exists } from "../lib/fs-ops.js";
import { collectStatus } from "../lib/snapshot.js";
import { collectFindings } from "../lib/templates-model.js";
import { c } from "../lib/colors.js";
import { flagBool } from "../lib/args.js";
import { collectRuntimeFindings, checkLocalEnv } from "../lib/runtime.js";
import { sequence, stepRerun } from "../lib/gates.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";
import { collectValidation } from "../lib/validation-model.js";
import { collectIndexDrift } from "../lib/scan.js";
import { collectReproducibility } from "../lib/reproducibility.js";

// Aggregate diagnostic: the one command to run when "something looks wrong"
// and you do not know which gate to ask. It sequences the existing checks —
// validate, index drift, clean-checkout lint, template shape — and reports
// each with its exact remediation command. A DRIVER over existing commands
// (like `close`): it adds no checks of its own, so it can never disagree
// with the authoritative gates it fronts.
//
// Every row is a COLLECTION read in this process (change 0045). Three of them
// used to be a `spawnSync` of this same binary with `--json`, whose output
// this command then parsed — two integration styles inside one command, three
// extra Node processes per run, and a failure mode — the report that never
// arrived — that existed only because of the choice. A driver calls its
// collectors.

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json", "env"], string: [] };

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

  // status is read once and shared: three rows below are views of the same
  // collection, and re-deriving it per row would make them disagree.
  const s = collectStatus(projectRoot);

  // How each declared diagnostic row renders, keyed by the step id in
  // SEQUENCES.doctor. As in `close`, the DECLARATION owns which rows exist
  // and in what order (lib/gates.js, audit finding F1); this table owns only
  // how one row is computed. A step with no reporter here falls back to
  // running its declared argv and reporting the exit code, so a gate added to
  // the sequence shows up as a row without a second edit.
  const reporters = {

    // 1. Structural gate (validate), machine-read so the counts are exact.
    validate: () => {
      // Read-only: `doctor` never passes fix — a diagnostic that repaired the
      // tree while reporting on it could not be run to find out what is wrong.
      const { errors, warnings } = collectValidation(projectRoot);
      if (errors.length > 0) {
        row("fail", "validate", `${errors.length} error${errors.length === 1 ? "" : "s"}, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}`, "doctrina validate  (then `doctrina validate --fix` for index drift)");
        for (const e of errors.slice(0, 3)) console.log(`        ${" ".repeat(16)} ${c.red("·")} ${e}`);
      } else if (warnings.length > 0) {
        warningsTotal += warnings.length;
        row("warn", "validate", `0 errors, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}`, "doctrina validate  (warnings listed there)");
      } else {
        row("ok", "validate", "all structural checks pass");
      }
    },

    // 2. Index ↔ tree drift.
    index: () => {
      const drift = collectIndexDrift(projectRoot);
      if (drift.ok) row("ok", "index", "index.json matches the tree");
      else row("fail", "index", "index.json has drifted from the tree", "doctrina validate --fix   (or `doctrina index rebuild`)");
    },

    // 3. Evidence and provenance ratios (cheap summaries; strict gates confirm).
    coverage: () => {
      if (s.coverage.totalCriteria === 0) {
        row("warn", "coverage", "no acceptance criteria declared yet", "write criteria with evidence — see `doctrina coverage`");
        warningsTotal += 1;
      } else if (s.coverage.pct === 100 && s.coverage.totalDangling === 0 && s.coverage.totalConditional === 0) {
        row("ok", "coverage", `${s.coverage.pct}% (${s.coverage.totalCovered}/${s.coverage.totalCriteria} criteria)`);
      } else {
        row("warn", "coverage", `${s.coverage.pct}% (${s.coverage.totalCovered}/${s.coverage.totalCriteria}${s.coverage.totalDangling ? `, ${s.coverage.totalDangling} dangling` : ""}${s.coverage.totalConditional ? `, ${s.coverage.totalConditional} conditional` : ""})`, "doctrina coverage   (cite the missing evidence)");
        warningsTotal += 1;
      }
    },

    trace: () => {
      if (s.trace.anchors === 0) {
        row("warn", "trace", "no intent anchors declared in product.md", "tag bullets `- [SC1] ...`, add `**Realizes:**` to specs");
        warningsTotal += 1;
      } else if (s.trace.realized === s.trace.anchors && s.trace.untraceable === 0 && s.trace.dangling === 0) {
        row("ok", "trace", `${s.trace.realized}/${s.trace.anchors} anchors realized`);
      } else {
        row("warn", "trace", `${s.trace.realized}/${s.trace.anchors} realized, ${s.trace.dropped} dropped, ${s.trace.untraceable} untraceable`, "doctrina trace");
        warningsTotal += 1;
      }
    },

    // 4. Clean-checkout reproducibility lint (ADR 0008).
    "clean-checkout": () => {
      const clean = collectReproducibility(projectRoot);
      if (clean.findings.length === 0) row("ok", "clean-checkout", "no reproducibility footguns detected");
      else row("fail", "clean-checkout", "a fresh clone would not build/run as-is", "doctrina verify --clean   (fix the listed package.json footguns)");
    },

    // 5. Template shape vs the running CLI's recommendation. The row reports
    //    the ACTUAL findings and the remedy each one names, rather than
    //    assuming every failure is a missing section — an adapter pointer
    //    break was reported as "recommended sections/fields are missing" and
    //    sent the user to `templates update`, which does not touch adapters
    //    and so could never clear it (C2).
    templates: () => {
      let tmplFindings = [];
      try {
        tmplFindings = collectFindings(projectRoot).findings;
      } catch {
        tmplFindings = [];
      }
      if (tmplFindings.length === 0) {
        row("ok", "templates", "project follows the current template shape");
        return;
      }
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
    },

    // 6. The RUNTIME surface (change 0029). Every row above reads Markdown;
    //    this one reads what the Markdown CLAIMS about the running system and
    //    checks it — the wiring, the empty-vs-unset default, the enum, the
    //    selector that would match nothing. Still a driver: the checks belong
    //    to lib/runtime.js and `contract check` renders the same verdict.
    runtime: () => {
      const runtime = collectRuntimeFindings(projectRoot);
      const errs = runtime.findings.filter((f) => f.level === "error");
      const warns = runtime.findings.length - errs.length;
      if (runtime.contracts === 0) {
        row("ok", "runtime", "no contracts — nothing declares a runtime surface");
      } else if (runtime.declared === 0) {
        // Silence is not proof: an undeclared surface is UNCHECKED, and a row
        // that read "ok" here would be the exact false confidence this
        // command exists to prevent.
        row("warn", "runtime", `${runtime.contracts} contract${runtime.contracts === 1 ? "" : "s"}, 0 Wiring/Selectors rows — the runtime surface is unchecked`, "declare Wiring/Selectors rows, then `doctrina contract check`");
        warningsTotal += 1;
      } else if (errs.length > 0) {
        row("fail", "runtime", `${errs.length} declaration${errs.length === 1 ? "" : "s"} do not hold`, "doctrina triage   (each finding names its own fix)");
        for (const e of errs.slice(0, 3)) console.log(`        ${" ".repeat(16)} ${c.red("·")} ${e.code} ${e.message}`);
      } else if (warns > 0) {
        row("warn", "runtime", `${runtime.declared} declared row${runtime.declared === 1 ? " holds" : "s hold"}; ${warns} advisory finding${warns === 1 ? "" : "s"}`, "doctrina triage");
        warningsTotal += 1;
      } else {
        row("ok", "runtime", `${runtime.declared} declared row${runtime.declared === 1 ? " holds" : "s hold"}`);
      }
    },

    // 7. The local .env, declared with `flag: "env"` so the sequence carries
    //    it and the loop skips it unless asked. Off by default because it
    //    reads a file that is not committed and is none of CI's business;
    //    when asked for, it reports NAMES and enum membership only, never the
    //    value.
    "local-env": () => {
      const envFindings = checkLocalEnv(projectRoot);
      if (envFindings.length === 0) {
        row("ok", "local .env", "matches the declared names and enums (or no .env present)");
      } else {
        row("fail", "local .env", `${envFindings.length} finding${envFindings.length === 1 ? "" : "s"} — config would be rejected on boot`, "fix the named variables (values are never printed)");
        for (const e of envFindings.slice(0, 3)) console.log(`        ${" ".repeat(16)} ${c.red("·")} ${e.message}`);
      }
    },

    // 8. Verify configuration (the real build gate must exist to be run).
    "verify-config": () => {
      if (s.verify.invalid) row("fail", "verify config", ".doctrina/verify.json is invalid JSON", "fix the JSON, then `doctrina verify`");
      else if (!s.verify.configured) {
        row("warn", "verify config", "no verify.json — the build gate is undeclared", "doctrina verify --init");
        warningsTotal += 1;
      } else {
        // Executed proof and signed proof are different claims (change 0039):
        // a row that counts them together is the false confidence this
        // command exists to prevent.
        const so = s.verify.signoffs;
        const stale = so ? so.expired + so.unverifiable + so.pending : 0;
        const detail = `${s.verify.checks} check${s.verify.checks === 1 ? "" : "s"} declared` +
          (so && so.manual > 0 ? `, ${so.manual} signed rather than executed` : "") +
          " (run `doctrina verify` to execute)";
        if (stale > 0) {
          const parts = [];
          if (so.expired) parts.push(`${so.expired} expired`);
          if (so.unverifiable) parts.push(`${so.unverifiable} unverifiable`);
          if (so.pending) parts.push(`${so.pending} unsigned`);
          row("warn", "verify config", `${detail} — ${parts.join(", ")}`,
            "doctrina verify   (each names the re-sign command)");
          warningsTotal += 1;
        } else {
          row("ok", "verify config", detail);
        }
      }
    },
  };

  // The sequence, in the declared order. A step gated on a flag is skipped
  // silently when that flag is absent. A step declared without a reporter is
  // reported as UNCHECKED and names the command that answers it: this command
  // reads collections, and a row it cannot compute here is a gap in this file,
  // not something to shell out for. Silence would be the false confidence the
  // whole diagnostic exists to prevent.
  for (const step of sequence("doctor")) {
    if (step.flag && !flagBool(_flags, step.flag, false)) continue;
    const report = reporters[step.id];
    if (report) {
      report();
      continue;
    }
    row("warn", step.label, "declared in the doctor sequence but has no reporter here", stepRerun(step));
    warningsTotal += 1;
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

export const help = `
Usage: doctrina doctor

Aggregate diagnostic: run the structural gate (validate), the index
drift check, the coverage/trace ratios, the clean-checkout lint
(verify --clean), the template-shape check, the RUNTIME surface (the
declared wiring, enums and selectors, checked against the code and
workflows), and the verify-config presence — each reported with its
exact remediation command.

  --env    also check the local .env against the declared names and
           enums. Reports membership only; a rejected value is never
           printed, so this is safe to run and to paste.

A driver over the same collections the gates themselves render; it adds
no checks of its own, so it can never disagree with the gates it fronts,
and it runs entirely in this process — no subprocess, no re-parsing of
its own output. Read-only: it never repairs what it reports. Exits 1
when any area fails, 0 otherwise (warnings allowed).
`;
