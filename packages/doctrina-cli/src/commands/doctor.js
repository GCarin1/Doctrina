// @ts-check
import path from "node:path";
import process from "node:process";
import { exists, isFile, read, relPath } from "../lib/fs-ops.js";
import { collectStatus } from "../lib/snapshot.js";
import { collectFindings, surfaceBudget } from "../lib/templates-model.js";
import { c } from "../lib/colors.js";
import { flagBool } from "../lib/args.js";
import { collectRuntimeFindings, checkLocalEnv } from "../lib/runtime.js";
import { sequence, stepRerun } from "../lib/gates.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";
import { agentsMdBudget, collectValidation } from "../lib/validation-model.js";
import { collectIndexDrift } from "../lib/scan.js";
import { collectReproducibility } from "../lib/reproducibility.js";
import { configRows, loadConfig } from "../lib/config.js";
import { USAGE_ENV, summarise } from "../lib/usage.js";
import { OPERATIONS } from "../lib/commands.js";

import { coverageLabel } from "../lib/views.js";

// How many never-invoked operations the usage row names before pointing at
// `metrics --commands` for the rest. The spec states this number, so it is
// named here rather than repeated as a literal in three places.
const UNUSED_OPS_LISTED = 8;
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

    // The two budgets that are COUPLED, reported before either is breached
    // (change 0072). The generated surface block lives inside AGENTS.md, so
    // one command added to the catalog spends a line of both — and the
    // AGENTS.md ceiling is declared OUTPUT, which means `analyze` refuses the
    // raise-the-ceiling fix by design. The only remedy is to send less, and
    // knowing that a week before the warning fires is the difference between
    // choosing what to cut and cutting whatever is nearest.
    budgets: () => {
      // Both numbers come from their OWNER — `agentsMdBudget` and
      // `surfaceBudget` — never from a second count here, so this row can
      // never disagree with `validate` or `templates check` about a size
      // they all report.
      const agents = agentsMdBudget(projectRoot);
      const surface = surfaceBudget(projectRoot);
      // The coupling: the block is written INTO AGENTS.md, so the next
      // command added to the catalog spends a line of each. What is left is
      // therefore the smaller of the two slacks, not either one alone.
      const headroom = Math.min(agents.slack, surface.slack);
      const detail = `AGENTS.md ${agents.used}/${agents.soft} lines, ` +
        `surface block ${surface.used}/${surface.budget}`;
      const cost = `${headroom} line${headroom === 1 ? "" : "s"} of headroom — ` +
        "one command added to the catalog spends a line of each";
      if (agents.used > agents.soft || surface.used > surface.budget) {
        row("warn", "budgets", `${detail} — over a declared ceiling`,
          "cut prose from AGENTS.md or commands from the surface — both are OUTPUT budgets, so raising them is refused");
        warningsTotal += 1;
      } else if (headroom <= 1) {
        row("warn", "budgets", `${detail} — ${cost}`,
          "cut prose from AGENTS.md now, while there is still a choice about what goes");
        warningsTotal += 1;
      } else {
        row("ok", "budgets", `${detail} · ${cost}`);
      }
    },

    // 3. Evidence and provenance ratios (cheap summaries; strict gates confirm).
    coverage: () => {
      if (s.coverage.totalCriteria === 0) {
        row("warn", "coverage", "no acceptance criteria declared yet", "write criteria with evidence — see `doctrina coverage`");
        warningsTotal += 1;
      } else if (s.coverage.pct === 100 && s.coverage.totalDangling === 0 && s.coverage.totalConditional === 0) {
        row("ok", "coverage", coverageLabel(s.coverage));
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
      } else if (errs.length > 0) {
        // An error is an error whether or not any Wiring/Selectors row was
        // declared: the structural half (CT01-CT03, change 0103) fails a
        // contract that declares no rows at all, and "unchecked" would
        // hide it.
        row("fail", "runtime", `${errs.length} finding${errs.length === 1 ? "" : "s"} do${errs.length === 1 ? "es" : ""} not hold`, "doctrina contract check   (each finding names its own fix)");
        for (const e of errs.slice(0, 3)) console.log(`        ${" ".repeat(16)} ${c.red("·")} ${e.code} ${e.message}`);
      } else if (runtime.declared === 0) {
        // Silence is not proof: an undeclared surface is UNCHECKED, and a row
        // that read "ok" here would be the exact false confidence this
        // command exists to prevent.
        row("warn", "runtime", `${runtime.contracts} contract${runtime.contracts === 1 ? "" : "s"}, 0 Wiring/Selectors rows — the runtime surface is unchecked`, "declare Wiring/Selectors rows, then `doctrina contract check`");
        warningsTotal += 1;
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

    // 9. What this project has CONFIGURED, and what is simply the default.
    //    Never a failure: it reports the effective value of each option and
    //    the file it came from, so "why is clarify using English here?" has
    //    an answer that does not involve reading the CLI's source.
    config: () => {
      const rows = configRows(projectRoot);
      const set = rows.filter((r) => r.configured);
      // The FILE first, then the values (change 0115): over an invalid
      // config.json this row said "ok, all at their defaults" — true of the
      // values, false of the file, on the same screen where the validate
      // row failed it. A key the CLI does not know is named, not ignored.
      const cfg = loadConfig(projectRoot);
      const summary = set.length === 0
        ? `all ${rows.length} options at their defaults`
        : `${set.length} of ${rows.length} options configured`;
      if (cfg.errors.length > 0) {
        row("fail", "config", cfg.errors[0], "fix .doctrina/config.json, then `doctrina validate`");
      } else if (cfg.unknown.length > 0) {
        row("warn", "config", `${summary}; unknown key${cfg.unknown.length === 1 ? "" : "s"} ${cfg.unknown.map((k) => `"${k}"`).join(", ")} ignored`, "the keys are language, context_budget, rules");
        warningsTotal += 1;
      } else {
        row("ok", "config", summary);
      }
      for (const r of rows) {
        console.log(`        ${" ".repeat(16)} ${c.gray("·")} ${r.option.padEnd(15)} ${r.value.padEnd(22)} ${c.gray(r.source)}`);
      }
    },

    // 10. Which of the catalog's operations have never been reached for —
    //     but ONLY when the operator turned the log on. `lib/usage.js` was
    //     built to instrument the surface before shrinking it, and the only
    //     reader was a command someone had to think to type, so the decision
    //     it exists to inform kept being taken on opinion (audit finding
    //     F16). It reports and never writes: no log file is created here.
    usage: () => {
      const target = process.env[USAGE_ENV];
      if (!target || !isFile(target)) return;
      const catalog = OPERATIONS.map(([op]) => op);
      const { samples, unused } = summarise(read(target), catalog);
      if (samples === 0) {
        row("ok", "usage", `${relPath(projectRoot, target)} is empty — nothing recorded yet`);
        return;
      }
      const detail = `${samples} sample${samples === 1 ? "" : "s"}; ` +
        `${unused.length} of ${catalog.length} operations never invoked`;
      row("ok", "usage", detail);
      // Zero samples for an operation is a CANDIDATE, never a verdict: a
      // command reached for once a quarter and one nobody wants look
      // identical over a week. ADR 0026: retiring one needs demonstrated
      // redundancy, and this list is where you go looking for it.
      for (const op of unused.slice(0, UNUSED_OPS_LISTED)) {
        console.log(`        ${" ".repeat(16)} ${c.gray("·")} never invoked: ${op}`);
      }
      if (unused.length > UNUSED_OPS_LISTED) {
        console.log(`        ${" ".repeat(16)} ${c.gray(`· … ${unused.length - UNUSED_OPS_LISTED} more — doctrina metrics --commands`)}`);
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
