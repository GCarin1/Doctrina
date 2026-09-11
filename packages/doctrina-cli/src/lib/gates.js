// @ts-check
import { checklistProgress, getSection } from "./doc-model.js";
import path from "node:path";
import { appendFileSync, writeFileSync } from "node:fs";
import { exists, isFile, mkdirp, read } from "./fs-ops.js";
import { today } from "./dates.js";
import { collectAnalysis } from "./analysis.js";
import { appendLedgerLine, forcedLine } from "./ledger.js";

// The gate-to-transition map (audit item C6).
//
// Each command used to decide its own preconditions. `change archive` and
// `close` checked theirs; `change apply` checked nothing. So `analyze`
// could exit 1 on a change and `change apply` would mutate it anyway and
// exit 0 — and the README flowchart tells agents to follow exactly that
// analyze → apply path. An agent could reach, through one path, a state
// another path forbids.
//
// The fix is not "add a check to apply" but "declare once which gates
// guard which transition, and have every driver consult the declaration".
// Which specific gate guards which transition matters less than the
// guarantee that the answer does not depend on how you got there.

// A gate is a named precondition returning human-readable blockers.
export const GATES = {
  // Structural validity: the change's own files parse and point at real
  // targets. The same checks `doctrina analyze` reports.
  structure: {
    label: "structure",
    rerun: (id) => `doctrina analyze ${id}`,
    blockers(projectRoot, changeDir) {
      return collectAnalysis(projectRoot, changeDir)
        .filter((r) => r.kind === "fail")
        .map((r) => stripAnsi(r.line).replace(/^✗\s*/, "").trim());
    },
  },

  // Integrity: the subset of the structural questions that are true at
  // EVERY point in a change's life — the proposal says why and what, the
  // tasks are real, the deltas parse. Everything `structure` asks except
  // the handful that only mean something before an apply.
  //
  // This exists because excluding `structure` wholesale from `archive` (to
  // dodge the post-apply false positive documented below) also excluded the
  // hollow-proposal check, which has no such problem. A change could then be
  // archived — and stamped "applied" — with `## What` still holding nothing
  // but its scaffold comment, after `apply` had refused it for exactly that.
  // Observed on change 0030 of this repository, one release after the
  // history recorded six hollow proposals reaching the archive.
  integrity: {
    label: "integrity",
    rerun: (id) => `doctrina analyze ${id}`,
    blockers(projectRoot, changeDir) {
      return collectAnalysis(projectRoot, changeDir)
        .filter((r) => r.kind === "fail" && r.scope !== "pre-apply")
        .map((r) => stripAnsi(r.line).replace(/^✗\s*/, "").trim());
    },
  },

  // Verification: the work is claimed complete. Every checkbox in
  // tasks.md (closing steps included) and in the proposal's
  // "## Verification" section.
  verification: {
    label: "verification",
    rerun: (id) => `doctrina change tick ${id}`,
    blockers(projectRoot, changeDir) {
      const out = [];
      // Same counter as every other surface (change 0067).
      const countUnchecked = (text, section = null) =>
        checklistProgress(text, { section }).total - checklistProgress(text, { section }).done;

      const tasksPath = path.join(changeDir, "tasks.md");
      if (isFile(tasksPath)) {
        const n = countUnchecked(read(tasksPath));
        if (n > 0) out.push(`${n} unchecked task${n === 1 ? "" : "s"} in tasks.md (closing steps count)`);
      }
      const proposalPath = path.join(changeDir, "proposal.md");
      if (isFile(proposalPath)) {
        const n = countUnchecked(read(proposalPath), "Verification");
        if (n > 0) out.push(`${n} unmet verification item${n === 1 ? "" : "s"} in proposal.md (## Verification)`);
      }
      return out;
    },
  },
};

// Which gates guard each lifecycle transition. The single declaration.
//
// `apply` requires structure: mutating specs from a change whose deltas do
// not parse is how a malformed delta reaches a spec file. This is the gate
// `analyze` reports and that `apply` used to ignore entirely (C6).
//
// `archive` requires verification, and deliberately NOT structure. The
// structure gate is a PRE-APPLY question — "is this safe to apply?" — and
// one of its checks is that an ADDED delta's target does not already hold
// real content. After a successful apply that target holds exactly the
// content the delta just wrote, so re-asking at archive time reports a
// conflict that is the proof the apply worked. A gate must be asked at the
// point its question is meaningful.
//
// `archive` therefore requires INTEGRITY — that same structural question
// set minus the pre-apply-only checks — rather than nothing structural at
// all. Excluding the whole gate to dodge three checks also excluded the
// hollow-proposal check, and a change refused by `apply` for an unwritten
// `## What` could still be archived and stamped "applied".
export const TRANSITIONS = {
  apply: { label: "change apply", gates: ["structure"] },
  archive: { label: "change archive", gates: ["integrity", "verification"] },
};

// ---------------------------------------------------------------------------
// The gate SEQUENCES (audit finding F1)
// ---------------------------------------------------------------------------
//
// ADR 0017 promised ONE gate map. TRANSITIONS above delivered it for the two
// mutating transitions and stopped there: `close` carried a literal array of
// ten steps, `doctor` eight hand-written rows, and `action.yml` five YAML
// steps. Four lists, four owners, and nothing that noticed when they
// diverged — which is how the runtime gate could land in `close` and stay
// absent from CI (change 0033 had to add it to both by hand, and nothing
// would have caught it if the second edit had been forgotten).
//
// So a sequence is DATA. Each step declares what it is, how hard it bites,
// and the command that runs it standalone. The surfaces only RENDER it:
// `close` executes it in order, `doctor` reports each as a row, and
// `doctrina ci --emit github` writes it as CI YAML. None of them may invent
// a step, drop one, or reorder — a drift test holds each surface to this
// declaration, and the emitted YAML to the versioned `action.yml`.
//
// What this does NOT decide is which gates belong in a sequence; it declares
// the sequences that exist so that the answer lives in one file.

/**
 * One step of a gate sequence.
 *
 * @typedef {object} GateStep
 * @property {string} id        Stable key. The surfaces bind their renderer/runner to it.
 * @property {string} label     What the surface calls the step.
 * @property {"blocking"|"advisory"|"forceable"} level
 *   blocking  — a non-zero result stops the sequence.
 *   advisory  — reported, never stops anything.
 *   forceable — blocking, unless --force, which records the gap in the ledger.
 * @property {string[]|null} argv
 *   The standalone CLI invocation this step is, or null when the step is not
 *   one command (the ADR checkpoint, the docs gate). The token "<id>" is
 *   replaced with the change id at render time.
 * @property {string} [rerun]   Literal rerun line, for a step argv cannot describe.
 * @property {string} [why]     One line of rationale. The CI emitter writes it as a comment.
 * @property {boolean} [strict] CI only: the command takes --strict when the action runs strict.
 * @property {string} [script]  CI only: a shell body that replaces the derived one-liner.
 * @property {string} [flag]    Only run/report this step when that flag is set.
 * @property {string} [short]   CI only: the name used in the action's own description.
 * @property {string} [summary] CI only: the name plus what it checks, for the file header.
 */

/** @type {Record<string, GateStep[]>} */
export const SEQUENCES = {
  // The closing sequence. `close` runs these in order, in-process where it
  // can, stopping at the first blocking failure with the step's rerun line.
  close: [
    { id: "analyze", label: "analyze", level: "blocking", argv: ["analyze", "<id>"] },
    { id: "adr-checkpoint", label: "ADR checkpoint (advisory)", level: "advisory", argv: ["decision", "list"] },
    // Conformance review (audit finding F3). It is the richest analysis the
    // project has — capabilities whose code moved while their spec did not,
    // affected dependants, dangling coverage — and no driver invoked it, so
    // it only ever happened when somebody typed the command.
    //
    // BEFORE the apply, deliberately: that is the point where its findings can
    // still change what gets written. Advisory for now — it raises a break for
    // every capability with touched code and a still spec, and that noise has
    // to be measured before it is allowed to refuse. `review --strict` remains
    // the door for a project that wants CI to block on it.
    { id: "review", label: "review (advisory)", level: "advisory", argv: ["review"] },
    { id: "apply", label: "apply", level: "blocking", argv: ["change", "apply", "<id>"] },
    { id: "runtime", label: "runtime", level: "blocking", argv: ["contract", "check"] },
    { id: "implementation", label: "implementation (advisory)", level: "advisory", argv: null, rerun: "doctrina spec set <cap> --implementation auto" },
    { id: "verify", label: "verify", level: "blocking", argv: ["verify"] },
    { id: "coverage", label: "coverage", level: "blocking", argv: ["coverage", "--strict"] },
    { id: "trace", label: "trace", level: "advisory", argv: ["trace"] },
    { id: "docs", label: "docs", level: "forceable", argv: null, rerun: "document the change, then rerun" },
    { id: "archive", label: "archive", level: "blocking", argv: ["change", "archive", "<id>"] },
    // AFTER the archive, because the archive is the last step that WRITES the
    // index, and a gate placed before the step it guards cannot guard it.
    //
    // The drift check already ran, inside `verify` — and that is exactly why
    // it missed: `verify` is five steps earlier, so it certified an index the
    // archive had not yet rewritten. Change 0138 closed green on a tree whose
    // index had drifted, the commit shipped, and all six test legs of CI went
    // red on the next push. The close was not wrong about what it checked; it
    // checked before the damage.
    //
    // `validate` cannot stand in for it: drift of that kind is only visible by
    // rebuilding the index and comparing, which validate deliberately does not
    // do.
    { id: "index-drift", label: "index drift", level: "blocking", argv: ["index", "rebuild", "--check"] },
    { id: "validate", label: "validate", level: "blocking", argv: ["validate"] },
  ],

  // The diagnostic sequence. Every row is advisory in the sense that `doctor`
  // never mutates anything; the level says whether the row counts as a
  // failing area (exit 1) or an advisory one (exit 0).
  doctor: [
    { id: "validate", label: "validate", level: "blocking", argv: ["validate"] },
    { id: "index", label: "index", level: "blocking", argv: ["index", "rebuild", "--check"] },
    { id: "coverage", label: "coverage", level: "advisory", argv: ["coverage"] },
    { id: "trace", label: "trace", level: "advisory", argv: ["trace"] },
    { id: "clean-checkout", label: "clean-checkout", level: "blocking", argv: ["verify", "--clean"] },
    { id: "templates", label: "templates", level: "advisory", argv: ["templates", "check"] },
    { id: "runtime", label: "runtime", level: "blocking", argv: ["contract", "check"] },
    { id: "local-env", label: "local .env", level: "blocking", argv: null, rerun: "doctrina doctor --env", flag: "env" },
    { id: "verify-config", label: "verify config", level: "blocking", argv: ["verify", "--init"] },
    // The declared size budgets, and the headroom left. Reported BEFORE either
    // is breached: `agents-md-lines` is OUTPUT, so `analyze` refuses the
    // raise-the-ceiling fix, and the generated surface block lives inside
    // AGENTS.md — one command added spends a line of both (change 0072).
    { id: "budgets", label: "budgets", level: "advisory", argv: null, rerun: "doctrina validate" },
    // Not a check — a READOUT. Every other row can fail; this one exists
    // because a project could not see what it had configured without reading
    // the CLI's source, which is how a pt-BR project sat red under `clarify`
    // with no clue why (change 0047). Advisory: a default is not a fault.
    { id: "config", label: "config", level: "advisory", argv: null, rerun: "edit .doctrina/config.json" },
    // Also a readout, and also advisory. It appears only when the operator
    // has switched the usage log on: an instrument that is off has nothing
    // to say, and a row saying so every run would train the reader to skip
    // the section (change 0050).
    { id: "usage", label: "usage", level: "advisory", argv: null, rerun: "doctrina metrics --commands" },
  ],

  // The CI sequence, emitted as the composite action. Deliberately WITHOUT
  // `verify`: the build gate is the adopting project's own to run, and the
  // action exists to check the artifact tree.
  ci: [
    { id: "validate", label: "doctrina validate", level: "blocking", argv: ["validate"], short: "validate", summary: "validate (schema/structure)" },
    { id: "index-drift", label: "doctrina index rebuild --check", level: "blocking", argv: ["index", "rebuild", "--check"], short: "index drift", summary: "index rebuild --check (index ↔ tree drift)" },
    {
      id: "contract-check",
      label: "doctrina contract check",
      level: "blocking",
      argv: ["contract", "check"],
      short: "contract check",
      summary: "contract check (the declared runtime surface, RT01-RT05)",
      why:
        "The runtime gate (RT01-RT05). Every other step reads Markdown; this one\n" +
        "reads what the Markdown CLAIMS about the running system and holds the\n" +
        "implementation to it — the variable no workflow exports, the default an\n" +
        "empty CI value never triggers, the unvalidated enum, the selector that\n" +
        "matches nothing and still exits 0. Not gated on `strict`: a declaration\n" +
        "that does not hold is an error at any adoption stage. A project with no\n" +
        "contracts prints one line and exits 0.",
    },
    { id: "coverage", label: "doctrina coverage", level: "blocking", argv: ["coverage"], strict: true, short: "coverage", summary: "coverage (acceptance-criteria evidence)" },
    { id: "trace", label: "doctrina trace", level: "blocking", argv: ["trace"], strict: true, short: "trace", summary: "trace (intent provenance)" },
    {
      id: "context-budget",
      label: "doctrina context (budget)",
      level: "blocking",
      argv: ["context"],
      short: "context budget",
      summary: "context (the pack budget, ADR 0022)",
      why:
        "The context budget (ADR 0022). A pack that degrades to fit is fine; this\n" +
        "fails only when a pack's irreducible core no longer fits at all, which\n" +
        "means a spec has outgrown itself or a change has gone stale. Configure\n" +
        "the ceiling per project with \"context_budget\": n in\n" +
        ".doctrina/config.json.",
      script:
        "{{PREFIX}} context >/dev/null\n" +
        "for cap in $(ls .doctrina/specs 2>/dev/null); do\n" +
        "  {{PREFIX}} context \"$cap\" >/dev/null\n" +
        "done",
    },
  ],
};

/** The declared steps of a sequence, or an error naming the ones that exist. */
export function sequence(name) {
  const steps = SEQUENCES[name];
  if (!steps) throw new Error(`unknown gate sequence "${name}" (declared: ${Object.keys(SEQUENCES).join(", ")})`);
  return steps;
}

/**
 * The command that runs one step on its own — what a surface prints when it
 * tells the operator how to clear the gate. Derived from `argv` so the
 * declaration cannot disagree with itself; `rerun` covers the steps that are
 * not a single command.
 */
export function stepRerun(step, changeId = "<id>") {
  if (step.rerun) return step.rerun;
  if (!step.argv) return `doctrina ${step.id}`;
  return `doctrina ${step.argv.map((a) => (a === "<id>" ? changeId : a)).join(" ")}`;
}

// Evaluate a transition's gates. Returns { ok, blockers, gates } where
// blockers is a flat list of human-readable reasons.
export function checkTransition(projectRoot, changeDir, transition) {
  const t = TRANSITIONS[transition];
  if (!t) throw new Error(`unknown transition "${transition}"`);
  const blockers = [];
  for (const name of t.gates) {
    for (const b of GATES[name].blockers(projectRoot, changeDir)) {
      blockers.push({ gate: name, message: b });
    }
  }
  return { ok: blockers.length === 0, blockers, gates: t.gates };
}

// Record a forced transition in the archive ledger, so a gap that was
// waved through is part of the visible history rather than nothing at all
// — the same posture `change archive --force` and `change abandon` take.
export function recordForcedGap(projectRoot, id, transition, blockers) {
  // The ledger owns its own format and its own creation (lib/ledger.js): a
  // forced transition can happen before any change has ever been archived,
  // and a gap that goes unrecorded because the file did not exist yet is
  // exactly the silence this is meant to break.
  appendLedgerLine(projectRoot, forcedLine(id, transition, blockers));
  return true;
}

function stripAnsi(s) {
  // eslint-disable-next-line no-control-regex
  return String(s).replace(/\[[0-9;]*m/g, "");
}
