// @ts-check
import { getSection } from "./doc-model.js";
import path from "node:path";
import { appendFileSync, writeFileSync } from "node:fs";
import { exists, isFile, mkdirp, read } from "./fs-ops.js";
import { today } from "./dates.js";
import { collectAnalysis } from "../commands/analyze.js";

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

  // Verification: the work is claimed complete. Every checkbox in
  // tasks.md (closing steps included) and in the proposal's
  // "## Verification" section.
  verification: {
    label: "verification",
    rerun: (id) => `doctrina change tick ${id}`,
    blockers(projectRoot, changeDir) {
      const out = [];
      const countUnchecked = (s) => (s.match(/^\s*-\s*\[ \]/gm) ?? []).length;

      const tasksPath = path.join(changeDir, "tasks.md");
      if (isFile(tasksPath)) {
        const n = countUnchecked(read(tasksPath));
        if (n > 0) out.push(`${n} unchecked task${n === 1 ? "" : "s"} in tasks.md (closing steps count)`);
      }
      const proposalPath = path.join(changeDir, "proposal.md");
      if (isFile(proposalPath)) {
        const n = countUnchecked(getSection(read(proposalPath), "Verification"));
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
export const TRANSITIONS = {
  apply: { label: "change apply", gates: ["structure"] },
  archive: { label: "change archive", gates: ["verification"] },
};

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
  const archiveDir = path.join(projectRoot, ".doctrina", "changes", "archive");
  const ledgerPath = path.join(archiveDir, "LEDGER.md");
  // Create the ledger if this is the first entry. A forced transition can
  // happen before any change has ever been archived, and a gap that goes
  // unrecorded because the file did not exist yet is exactly the silence
  // this is meant to break.
  if (!exists(ledgerPath)) {
    mkdirp(archiveDir);
    writeFileSync(ledgerPath,
      "# Change ledger\n\n" +
      "One line per archived change, newest last. Appended by\n" +
      "`doctrina change archive`; edit freely, the CLI only appends.\n\n");
  }
  const summary = blockers.map((b) => `${b.gate}: ${b.message}`).join("; ");
  appendFileSync(
    ledgerPath,
    `  - ${today()} — ${id} — forced ${transition} past ${blockers.length} ` +
    `blocker${blockers.length === 1 ? "" : "s"} (${summary})\n`,
  );
  return true;
}

function stripAnsi(s) {
  // eslint-disable-next-line no-control-regex
  return String(s).replace(/\[[0-9;]*m/g, "");
}
