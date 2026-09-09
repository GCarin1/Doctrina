// @ts-check
import path from "node:path";
import process from "node:process";
import { appendFileSync } from "node:fs";
import { exists, isDir, isFile, read, walk } from "../lib/fs-ops.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { parseCapabilityFromDelta } from "../lib/doc-model.js";
import { printAdrCheckpoint, acceptedDecisionCount } from "../lib/adr-guard.js";
import { docsRemedy, checkDocsImpact } from "../lib/docs-impact.js";
import { collectRuntimeFindings } from "../lib/runtime.js";
import { derivedImplementations, implementationMismatch, summarize } from "../lib/coverage-model.js";
import { specHeader, dependentsOf } from "../lib/scan.js";
import { sequence, stepRerun } from "../lib/gates.js";
import { EXIT, notADoctrinaProject } from "../lib/exit-codes.js";
import * as analyze from "./analyze.js";
import * as change from "./change.js";
import * as verify from "./verify.js";
import * as coverage from "./coverage.js";
import * as trace from "./trace.js";
import * as validate from "./validate.js";
import { appendLedgerLine, docsGapLine, ledgerPath as ledgerFile } from "../lib/ledger.js";
import * as review from "./review.js";
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
  // A change id that does not resolve is the USAGE class, before any step
  // is sequenced (change 0114) — every sibling that takes a change id
  // answers 2; `close` answered 1 through the analyze step it ran first.
  if (!isDir(path.join(projectRoot, ".doctrina", "changes", id))) {
    console.error(c.red("error:") + ` change "${id}" not found at .doctrina/changes/${id}`);
    console.error(c.gray("hint: ") + "open changes: `doctrina next`");
    return EXIT.USAGE;
  }
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
          // "No ADR cites these capabilities" is conformance only when there
          // ARE accepted ADRs to cite them. With none on disk the sentence is
          // vacuously true, and printing it as `ok` reads as a decision
          // checked rather than a checkbox with nothing behind it (0089).
          const accepted = acceptedDecisionCount(projectRoot);
          if (accepted === 0) {
            console.log(c.gray("·      no accepted ADR in the tree — nothing to check the change against"));
          } else {
            console.log(c.green("ok") + ` no accepted ADR cites the touched capabilities (${accepted} checked)`);
          }
        }
        return 0;
      },
    },

    // The review runs against the working tree, which for a close IS the
    // change's diff: the work is done and not yet archived. Its exit code is
    // discarded on purpose — the step is declared advisory, and an advisory
    // step that could still move the close's result would be advisory in name
    // only. A crash is caught by the loop and reported the same way.
    review: {
      run: async () => {
        await review.run([], new Map());
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
          console.error(c.red("error:") + ` ${errs} contract finding${errs === 1 ? "" : "s"} block${errs === 1 ? "s" : ""} the close — the same ${errs === 1 ? "one" : "ones"} \`doctrina contract check\` reports`);
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

    // The Implementation header, PROPOSED rather than remembered (audit
    // finding F10). The `work` playbook asked the agent twice to advance a
    // field whose correct value coverage had already computed one file over.
    // Advisory and non-mutating by design: the close prints the `set-header`
    // op for the capabilities this change touched, and a human — or
    // `spec set --implementation auto` — applies it. A gate that rewrote the
    // claim it checks would be marking its own homework.
    implementation: {
      run: async () => {
        const scope = touched.length > 0 ? new Set(touched) : null;
        const derived = derivedImplementations(projectRoot, { only: scope });
        const proposals = [];
        for (const [cap, row] of derived) {
          const specPath = path.join(projectRoot, ".doctrina", "specs", cap, "spec.md");
          if (!isFile(specPath)) continue;
          const mismatch = implementationMismatch(specHeader(read(specPath), "Implementation"), row.derived);
          if (mismatch) proposals.push({ cap, row, mismatch });
        }
        if (derived.size === 0) {
          // "Every touched spec matches" over ZERO specs is vacuously true.
          // A chore in a project with no capability spec reached this and was
          // told its implementation headers were in order (change 0089).
          console.log(c.gray("·      no spec to check — the change touches no capability"));
          return 0;
        }
        if (proposals.length === 0) {
          console.log(c.green("ok") + ` every touched spec's Implementation header matches its coverage (${derived.size} checked)`);
          return 0;
        }
        for (const { cap, row, mismatch } of proposals) {
          console.log(c.yellow("  ! ") + `${cap}: Implementation is "${mismatch.written}" but ` +
            `${row.covered}/${row.total} criteria have resolving proof`);
          console.log(`      ${c.gray("delta op: ")}${c.cyan(mismatch.op)}`);
          console.log(`      ${c.gray("or:       ")}${c.cyan(`doctrina spec set ${cap} --implementation auto`)}`);
        }
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
      run: async () => {
        const code = await coverage.run([], coverageFlags);
        reportDependentCoverage(projectRoot, touched);
        return code;
      },
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
        // The remedy comes out of the project being checked, never out of
        // Doctrina's own repository (change 0058): an adopting project with
        // no `docs/` was being told to write English AND Portuguese and to
        // read a skill it does not have.
        console.error(c.gray("hint: ") + docsRemedy(projectRoot) +
          ", or pass --force to close anyway (records the gap)");
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
      // A step declared with no in-process runner is a gap in THIS file, and
      // it is reported as one — the same answer `doctor` gives (change 0060).
      // The close used to shell out to its own binary here instead, which was
      // the second integration style change 0045 removed from `doctor`; every
      // declared step has a runner and a test holds it that way, so the
      // fallback was a second answer to a question nobody could reach.
      run: runner.run ?? (() => missingRunner(step)),
    };
  });

  // The banner is the declaration read aloud, so it cannot fall behind the
  // sequence it announces the way a hand-maintained string did.
  console.log(c.bold(`Closing change ${id}`) +
    c.gray(` — ${sequence("close").map((s) => s.label.replace(" (advisory)", "")).join(" → ")}`));

  // What the closing line is allowed to claim. A step that was SKIPPED was
  // not performed, and the conclusion used to say "verified, archived, and
  // validated" as a fixed string — including on a close whose own step 7 had
  // just printed `skip   no .doctrina/verify.json`. The final line is the one
  // sentence a human reads before approving; a word it did not earn is the
  // most expensive claim in the tree (change 0089).
  const ran = new Set();
  const skippedSteps = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log("");
    console.log(c.gray(`──── ${i + 1}/${steps.length} ${step.label}`));
    if (step.skip) {
      console.log(c.yellow("skip   ") + step.skip);
      skippedSteps.push(step);
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
    ran.add(step.id);
  }

  // Record a forced docs gap in the ledger, so history shows the change
  // shipped without its documentation rather than showing nothing.
  if (docsGap) {
    const ledgerPath = ledgerFile(projectRoot);
    if (isFile(ledgerPath)) {
      // Written in the ledger's own entry grammar (change 0046): a waived
      // gate no reader can find is the same as an unrecorded one.
      appendLedgerLine(projectRoot, docsGapLine(id, docsGap.signals));
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
  console.log(c.green(`✓ change ${id} closed`) + c.gray(closingClaim(ran, skippedSteps)));
  console.log(c.gray("Next: ") + c.cyan("doctrina next"));
  return 0;
}

// A step the sequence declares and this file does not implement. The gate map
// is the single source of truth for what a close runs (ADR 0017), so a step
// with no runner here is a defect in this file — not a reason to start a
// second process and not a reason to pass silently. `doctor` reaches the same
// conclusion for its own reporters; the two drivers now give one answer.
// The closing sentence, built from the steps that actually ran.
//
// Each word names one step: `verify` -> verified, `archive` -> archived,
// `validate` -> validated. A step that was skipped loses its word and is
// named instead, so the line can never claim more than the run performed.
function closingClaim(ran, skippedSteps) {
  const words = [
    ["verify", "verified"],
    ["archive", "archived"],
    ["validate", "validated"],
  ].filter(([stepId]) => ran.has(stepId)).map(([, word]) => word);

  const claimed = words.length === 0
    ? ""
    : words.length === 1
      ? ` — ${words[0]}.`
      : ` — ${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}.`;

  const skipped = skippedSteps.map((s) => s.label.replace(" (advisory)", ""));
  if (skipped.length === 0) return claimed || " — no gate ran.";
  return `${claimed || " —"} ${skipped.length === 1 ? "Skipped" : "Skipped"}: ${skipped.join(", ")}.`;
}

function missingRunner(step) {
  console.error(c.red("error:") +
    ` "${step.label}" is declared in the close sequence but has no runner here`);
  if (step.argv) {
    console.error(c.gray("hint: ") + `run it directly: doctrina ${step.argv.join(" ")}`);
  }
  return 1;
}

// The capabilities this change's deltas target — the honest scope for its
// coverage gate. Read from the change folder's specs/**/delta.md files.
// The capabilities that DECLARE a dependency on what this change touched,
// with their coverage — advisory, never part of the verdict (change 0046).
//
// The scope exists because one deliberately deferred spec elsewhere in the
// tree must not block a change that never went near it, and widening the gate
// to dependents would give that problem straight back. What a closing agent
// actually needs is the pointer: this change moved ground something else
// stands on, and here is how well that something is proven today.
function reportDependentCoverage(projectRoot, touched) {
  if (touched.length === 0) return;
  const dependents = dependentsOf(projectRoot, touched);
  if (dependents.length === 0) return;
  const byCap = new Map(summarize(projectRoot).perCap.map((r) => [r.cap, r]));
  console.log(c.gray("  dependents of the touched capabilities (advisory — not part of this gate):"));
  for (const dep of dependents) {
    const row = byCap.get(dep.capability);
    const proof = row && row.total > 0
      ? `${row.covered}/${row.total} criteria proven` + (row.dangling ? `, ${row.dangling} dangling` : "")
      : "no acceptance criteria";
    console.log(`    ${c.cyan(dep.capability)} depends on ${dep.dependsOn.join(", ")} — ${proof}` +
      c.gray(`  (doctrina why ${dep.capability})`));
  }
}

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
