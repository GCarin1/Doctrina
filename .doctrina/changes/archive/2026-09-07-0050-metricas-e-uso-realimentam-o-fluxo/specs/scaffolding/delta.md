# Spec Delta — capability: scaffolding

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/scaffolding/spec.md`

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

Two instruments the project already runs start reaching a surface someone
reads. Neither becomes a gate: both numbers move with things the CLI cannot
see, and a gate that cannot say what is wrong is not an honest gate (ADR 0008).

```ops
append-requirement event: When `doctrina metrics --trend` runs, the system shall read every saved snapshot in date order and report the movement of each tracked rate from the first snapshot to the last, stating that the direction is not a verdict, and shall say so plainly when fewer than two snapshots exist.
append-requirement event: When `doctrina report` runs inside a repository with history, the system shall include the period's revert rate and re-edit rate, derived from the same snapshot `metrics` renders for that window.
append-requirement event: When `doctrina doctor` runs and the usage log named by the environment exists, the system shall report how many operations in the catalog were never invoked and name some of them; with no log, or an empty one, it shall report nothing about usage.
append-requirement unwanted: The system shall not create, populate, or require a usage log in order to report on one, and shall not treat an operation with no samples as a defect.
append-criterion [verified] The saved snapshots are read as a series — malformed and non-snapshot files skipped — and the trend spans first to last rather than the last two — verified by `packages/doctrina-cli/test/metrics-feedback.test.js`.
append-criterion [verified] `report` and `metrics` state the same rates for the same window, and `doctor` reports usage only when the log exists, creating nothing — verified by `packages/doctrina-cli/test/metrics-feedback.test.js`.
bump-version minor
```
