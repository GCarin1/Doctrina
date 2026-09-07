// @ts-check
import path from "node:path";
import process from "node:process";
import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { exists, isFile, read, walk } from "../lib/fs-ops.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { parseCapabilityFromDelta } from "./change.js";
import { printAdrCheckpoint } from "../lib/adr-guard.js";
import { checkDocsImpact } from "../lib/docs-impact.js";
import { collectRuntimeFindings } from "../lib/runtime.js";
import { sequence, stepRerun } from "../lib/gates.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";
import * as analyze from "./analyze.js";
import * as change from "./change.js";
import * as verify from "./verify.js";
import * as coverage from "./coverage.js";
import * as trace from "./trace.js";
import * as validate from "./validate.js";
import * as skill from "./skill.js";

// One-command close (review 2026-06-27 passive-user feature #2). The work
// playbook lists the closing sequence — analyze → apply → runtime → verify →
// coverage → trace → archive → validate — and the agent runs it step by step, which is
// exactly where a gate gets skipped. `close` runs the whole sequence in one
// pass, in-process, stopping at the first failure with the exact command to
// rerun, so the agent makes one call and the human approves once. It is a
// driver over the existing commands; it adds no new checks of its own.

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json", "force"], string: [] };

const cliEntry = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "index.js");

export async function run(positional, flags) {
  if (positional.length === 0) {
    console.error(c.red("error:") + " close requires a change <id> (e.g. doctrina close 0001-add-login)");
    return 2;
  }
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }

  // Batch close (operator review 2026-07-19 §4.5): each id closes
  // independently, worst exit code wins, so a 9-change implementation lot is
  // one command, not nine.
  let worst = 0;
  for (const id of positional) {
    if (positional.length > 1) {
      console.log("");
      console.log(c.bold(`════ close ${id}`));
    }
    worst = Math.max(worst, await closeOne(projectRoot, id, flags));
  }
  if (positional.length > 1) {
    console.log("");
    console.log(worst === 0
      ? c.green("ok") + ` all ${positional.length} changes closed`
      : c.red("fail") + " at least one close stopped — see above");
  }
  return worst;
}

async function closeOne(projectRoot, id, flags) {
  const force = flagBool(flags, "force", false);
  const archiveFlags = force ? new Map([["force", true]]) : new Map();
  // Set by the docs gate when it fails, so a --force close can record the
  // gap in the ledger after the archive lands.
  /** @type {{ signals: string[] } | null} */
  let docsGap = null;

  // Scope the coverage gate to the capabilities THIS change touches (its
  // deltas), so one deliberately deferred spec elsewhere in the tree cannot
  // block closing a change that never went near it (0.11.0 field review
  // item 4). A change with no deltas (chore / metadata-only) falls back to
  // the whole-tree gate — there is no narrower honest scope for it.
  const touched = touchedCapabilities(projectRoot, id);
  /** @type {FlagMap} */
  const coverageFlags = new Map([["strict", true]]);
  let coverageRerun = "doctrina coverage --strict";
  if (touched.length > 0) {
    coverageFlags.set("only", touched.join(","));
    coverageRerun = `doctrina coverage --strict --only ${touched.join(",")}`;
  }

  // How each declared step actually runs, keyed by the step id in
  // SEQUENCES.close. The DECLARATION owns which steps exist, in what order,
  // and how hard each bites (lib/gates.js, audit finding F1); this table owns
  // only how to execute one in-process. A step declared with no runner here
  // falls back to spawning its declared `argv`, so a gate added to the
  // sequence appears in `close` — and in `doctor` and the CI action —
  // without a second edit; a drift test pins the two together.
  //
  // Each runner returns an exit code and may replace the step's label or
  // rerun line with a context-aware one (the coverage scope, the --force
  // archive), which is rendering, not sequencing.
  const verifyConfigured = isFile(path.join(projectRoot, ".doctrina", "verify.json"));
  const runners = {
    analyze: { run: () => analyze.run([id], new Map()) },

    // ADR checkpoint (operator review §4.6): the playbook's "record an ADR"
    // step was skippable in silence. Advisory — it names the accepted ADRs
    // whose text cites the touched capabilities and the amend commands, but
    // an ADR merely mentioning a capability is normal, so it never blocks.
    "adr-checkpoint": {
      run: async () => {
        if (printAdrCheckpoint(projectRoot, touched, { c }) === 0) {
          console.log(c.green("ok") + " no accepted ADR cites the touched capabilities");
        }
        return 0;
      },
    },

    apply: { run: () => change.run(["apply", id], new Map()) },

    // The RUNTIME gate (audit finding F2). RT01–RT05 live in lib/runtime.js
    // and no default driver ran them: `close` did not, `validate` only under
    // --runtime, and the published action not at all — so the one class of
    // break every structural gate is blind to (the declaration that no
    // longer matches the running system) reached production green. It sits
    // after `apply`, because the deltas the apply just merged are what may
    // have moved the surface the contract describes. A driver over
    // lib/runtime.js: the same findings `contract check`, `triage` and
    // `doctor` render, so the five can never disagree.
    //
    // Severity decides the level: an `error` blocks the close, a `warn` is
    // reported and the close continues. A project with no contracts — or
    // with contracts that declare no Wiring/Selectors rows — is not passing,
    // it is UNCHECKED, and saying so is what stops silence from reading as
    // proof.
    runtime: {
      run: async () => {
        const { findings, contracts, declared } = collectRuntimeFindings(projectRoot);
        if (contracts === 0) {
          console.log(c.gray("·      no contracts — nothing declares a runtime surface"));
          return 0;
        }
        for (const f of findings) {
          const mark = f.level === "error" ? c.red("  ✗ ") : c.yellow("  ! ");
          console.log(mark + `${f.contract}: ${f.message}` + c.gray(` [${f.code}]`));
          console.log(`      ${c.gray(`fix: ${f.remedy}`)}`);
        }
        const errs = findings.filter((f) => f.level === "error").length;
        if (errs > 0) {
          console.error(c.red("error:") + ` ${errs} declared row${errs === 1 ? " does" : "s do"} not hold`);
          return 1;
        }
        if (declared === 0) {
          console.log(c.yellow("warn:  ") +
            `${contracts} contract${contracts === 1 ? "" : "s"}, 0 Wiring/Selectors rows — the runtime surface is unchecked`);
          return 0;
        }
        const warns = findings.length;
        console.log(c.green("ok") + ` ${declared} declared row${declared === 1 ? " holds" : "s hold"}` +
          (warns > 0 ? c.gray(`; ${warns} advisory finding${warns === 1 ? "" : "s"} above`) : ""));
        return 0;
      },
    },

    // verify is conditional: skipped with a loud note when no verify.json is
    // declared, because a project may not have wired the real gate yet.
    verify: verifyConfigured
      ? { run: () => verify.run([], new Map()) }
      : { skip: "no .doctrina/verify.json — declare the real gate with `doctrina verify --init`" },

    coverage: {
      label: touched.length > 0 ? `coverage (scoped: ${touched.join(", ")})` : "coverage",
      rerun: coverageRerun,
      run: () => coverage.run([], coverageFlags),
    },

    // trace is advisory (provenance is a warning, not a hard gate): report it,
    // never let it block the close.
    trace: { run: async () => { await trace.run([], new Map()); return 0; } },

    // Docs ship inside the change (D2): a change that alters a documented
    // surface — a command, a flag, an exit code — closes only with the
    // documentation that describes it. A blocking gate, because a docs
    // phase scheduled after the work never happens; --force is the same
    // escape hatch archive offers, and records the gap in the ledger.
    docs: {
      run: async () => {
        const r = checkDocsImpact(projectRoot, path.join(projectRoot, ".doctrina", "changes", id));
        if (r.ok) {
          console.log(c.green("ok") + ` ${r.reason}`);
          return 0;
        }
        console.error(c.red("error:") + ` this change ${r.reason}:`);
        for (const s of r.signals) console.error(`  - ${s}`);
        console.error(c.gray("hint: ") +
          "document it in docs/en/ AND docs/pt/ (the `keep-docs-en-pt-parity` skill), " +
          "or pass --force to close anyway (records the gap)");
        docsGap = r;
        return 1;
      },
    },

    archive: {
      rerun: `doctrina change archive ${id}${force ? " --force" : ""}`,
      run: () => change.run(["archive", id], archiveFlags),
    },

    validate: { run: () => validate.run([], new Map()) },
  };

  const steps = sequence("close").map((step) => {
    const runner = runners[step.id] ?? {};
    return {
      id: step.id,
      label: runner.label ?? step.label,
      rerun: runner.rerun ?? stepRerun(step, id),
      forceable: step.level === "forceable",
      advisory: step.level === "advisory",
      skip: runner.skip,
      // A step declared with no in-process runner still runs: the declaration
      // carries the argv, so the sequence is honoured rather than silently
      // shortened by a missing entry in the table above.
      run: runner.run ?? (() => spawnStep(step, id, projectRoot)),
    };
  });

  // The banner is the declaration read aloud, so it cannot fall behind the
  // sequence it announces the way a hand-maintained string did.
  console.log(c.bold(`Closing change ${id}`) +
    c.gray(` — ${sequence("close").map((s) => s.label.replace(" (advisory)", "")).join(" → ")}`));

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log("");
    console.log(c.gray(`──── ${i + 1}/${steps.length} ${step.label}`));
    if (step.skip) {
      console.log(c.yellow("skip   ") + step.skip);
      continue;
    }
    let code;
    try {
      code = await step.run();
    } catch (err) {
      code = 1;
      console.error(c.red("error:") + ` ${err.message}`);
    }
    if (code !== 0) {
      // The declared level decides, not the runner: an advisory step reports
      // and the close carries on, which is what "advisory" means in
      // lib/gates.js and what the surfaces must agree on.
      if (step.advisory) {
        console.log(c.yellow("warn:") + ` "${step.label}" reported findings (advisory — the close continues)`);
        continue;
      }
      // A forceable gate under --force warns and continues, matching how
      // `change archive --force` handles incomplete verification: the gap
      // is recorded, not hidden.
      if (code !== 0 && step.forceable && force) {
        console.log(c.yellow("warn:") + ` proceeding past "${step.label}" (--force) — the gap is recorded in the ledger`);
        continue;
      }
      console.log("");
      console.log(c.red(`✗ close stopped at "${step.label}"`) + c.gray(` (step ${i + 1}/${steps.length})`));
      console.log(c.gray("Fix it, then rerun the step or the whole close:"));
      console.log(`    ${c.cyan(step.rerun)}`);
      console.log(`    ${c.cyan(`doctrina close ${id}`)}`);
      return 1;
    }
  }

  // Record a forced docs gap in the ledger, so history shows the change
  // shipped without its documentation rather than showing nothing.
  if (docsGap) {
    const ledgerPath = path.join(projectRoot, ".doctrina", "changes", "archive", "LEDGER.md");
    if (isFile(ledgerPath)) {
      appendFileSync(ledgerPath, `  - docs gap: ${id} closed with --force; ${docsGap.signals.join("; ")} documented nowhere\n`);
      console.log(c.yellow("ledger") + " recorded the docs gap");
    }
  }

  // Capture the lesson while it is fresh (operator review §4.7): surface the
  // fix-shaped lessons not yet written as skills, right where the operator
  // just proved they finish what they start. Advisory — a listing, never a
  // gate, and a suggest failure never un-closes the change.
  console.log("");
  console.log(c.gray("──── skills (advisory)"));
  try {
    await skill.run(["suggest"], new Map());
  } catch { /* advisory only */ }

  console.log("");
  console.log(c.green(`✓ change ${id} closed`) + c.gray(" — verified, archived, and validated."));
  console.log(c.gray("Next: ") + c.cyan("doctrina next"));
  return 0;
}

// Run a declared step that has no in-process runner, by invoking the CLI with
// the argv the declaration carries. This is what makes "add a gate to the
// sequence and it appears in every surface" true rather than aspirational:
// a step declared without a hand-written runner still executes here, and the
// drift test only has to hold the ids together, not each implementation.
function spawnStep(step, id, projectRoot) {
  if (!step.argv) {
    console.log(c.yellow("skip   ") + `"${step.label}" declares no command to run`);
    return 0;
  }
  const argv = step.argv.map((a) => (a === "<id>" ? id : a));
  const r = spawnSync(process.execPath, [cliEntry, ...argv], {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.status ?? 1;
}

// The capabilities this change's deltas target — the honest scope for its
// coverage gate. Read from the change folder's specs/**/delta.md files.
function touchedCapabilities(projectRoot, id) {
  const specsDir = path.join(projectRoot, ".doctrina", "changes", id, "specs");
  const caps = new Set();
  for (const deltaPath of walk(specsDir)) {
    if (!deltaPath.endsWith("delta.md")) continue;
    const cap = parseCapabilityFromDelta(read(deltaPath), deltaPath);
    if (cap) caps.add(cap);
  }
  return [...caps].sort();
}

export const help = `
Usage: doctrina close <id...> [--force]

Run the whole closing sequence for a change in one pass, stopping at the
first failure with the exact command to rerun:

  analyze → ADR checkpoint (advisory) → change apply → runtime → verify →
  coverage --strict (scoped to the change's touched capabilities) → trace →
  change archive → validate → skill suggest (advisory)

The coverage gate is scoped to the capabilities the change's deltas touch,
so a deliberately deferred spec elsewhere cannot block an unrelated close;
a change with no deltas gates on the whole tree. The runtime gate holds the
contracts' declared wiring, enums and selectors to the implementation (the
RT01-RT05 checks \`contract check\` renders): an error blocks, a warning is
reported and the close continues, and a project with no contracts — or with
contracts declaring no rows — is reported UNCHECKED rather than passing.
verify is skipped (with a note) when no .doctrina/verify.json is declared;
trace, the ADR checkpoint
(accepted ADRs citing the touched capabilities — amend via \`decision
supersede\`, not silence), and the closing skill-suggest listing are
advisory (reports, never blockers). This is a driver over the existing
commands so the agent makes one call instead of nine and the human
approves once.

Multiple ids close in sequence, each independently; the exit code is the
worst per-id result. Preview what close would refuse: \`doctrina change
check <id>\`.

Options:
  --force    Pass through to \`change archive\` (archive even if verification
             is incomplete; records the gap).
`;
