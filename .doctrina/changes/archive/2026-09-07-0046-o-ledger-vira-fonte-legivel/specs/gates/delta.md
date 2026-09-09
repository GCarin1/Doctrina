# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

<!--
For ADDED: include the full new spec body below. On apply, the body is
written verbatim to the target path.

For MODIFIED: prefer a fenced `ops` block — on apply the CLI executes it
against the target spec, all ops or none (ADR 0007). The verbs cover
headers, acceptance criteria, AND the EARS requirement bullets, so a
typical delta applies mechanically end to end; only free-prose rewrites
(Purpose, Maturity, ...) stay a by-hand merge. A MODIFIED delta with no
`ops` block prints a manual-merge pointer.

  ```ops
  set-header Implementation: verified — durable adapter (`src/db.ts`)
  bump-version minor
  set-criterion 1: verified
  append-criterion [unverified] new signal — verified by `test/x.test.ts`
  append-requirement event: When <trigger>, the system shall <action>.
  replace-requirement ubiquitous 2: The system shall <action>.
  ```

Requirement sections: ubiquitous | event | state | unwanted | optional.
append-* ops resolve numbering/position at APPLY time, so several open
changes appending to the same spec never collide on numbers — order of
application decides.

For REMOVED: the body may be empty; on apply, the target spec file is
deleted and the capability is recorded in the change archive only.
-->

---

<!-- delta body below -->

The ledger stops being a file only two things read. One parser owns its
grammar, the three writers append through it, and three surfaces read what it
records — all of them advisory, because history is context, not a verdict.

```ops
append-requirement event: When `doctrina report` runs, the system shall report how many archived changes touched each capability in the period, from the archive ledger rather than from the file history, and shall report the count without a verdict on it.
append-requirement event: When `doctrina review` runs, the system shall note how many changes each touched capability has landed in a recent window, as history rather than as a finding.
append-requirement event: When `doctrina close` runs the coverage gate, the system shall additionally report the capabilities that declare a dependency on the ones this change touched, with their coverage, without widening the gate to them.
append-requirement ubiquitous: The system shall read and write the archive ledger through one grammar, so that a line the CLI appends is a line the CLI can read back.
append-requirement unwanted: The system shall not fail, rewrite, or discard a ledger line a human wrote outside the entry grammar; it shall skip it and keep reading.
append-criterion [verified] The ledger of this repository parses in full — abandonments and waived-gate lines included — a hand-written line is skipped rather than fatal, and churn counts only the changes that landed — verified by `packages/doctrina-cli/test/ledger.test.js`.
append-criterion [verified] `report` shows capability churn for the period, `review` reports it as history, and `close` names the dependents of the touched capabilities without gating on them — verified by `packages/doctrina-cli/test/ledger.test.js`.
bump-version minor
```
