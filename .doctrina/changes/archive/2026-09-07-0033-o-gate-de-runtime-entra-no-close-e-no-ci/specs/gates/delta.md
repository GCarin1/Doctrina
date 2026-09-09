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

The runtime checks (RT01–RT05) existed with no default driver behind them:
`close` did not run them, `validate` only under `--runtime`, and the
published action not at all. This delta puts them where a break is caught —
the closing sequence and the CI gate set — without adding a check or a
second implementation of one.

```ops
replace-requirement event 31: When `doctrina close <id>` runs, the system shall drive the closing sequence in one pass — analyze → change apply → runtime → verify (skipped with a note when no `verify.json`) → coverage `--strict` → trace (advisory) → change archive → validate — stopping at the first failure with the exact command to rerun, and exit non-zero on that failure (review 2026-06-27).
append-requirement event: When `doctrina close <id>` reaches the runtime gate, the system shall evaluate the same runtime checks `contract check` renders and refuse the close when any finding is an error, while reporting a finding that is only a warning and continuing.
append-requirement event: When the shipped CI action runs, the system shall run the declared runtime checks as one of its gate steps, so a declaration that no longer holds fails the pipeline instead of passing it.
append-criterion [verified] A change whose contract declares wiring the named workflow does not export is refused by `doctrina close` at the runtime gate, and the same change closes once the export exists — verified by `packages/doctrina-cli/test/integration.test.js`.
append-criterion [verified] A project with no contracts, and one whose contracts declare no rows, close unchanged — the second reported as unchecked rather than passing — verified by `packages/doctrina-cli/test/integration.test.js`.
append-criterion [verified] The shipped CI action carries the runtime step, and the command it runs exits 1 on the same broken declaration — verified by `packages/doctrina-cli/test/integration.test.js`, `action.yml`.
bump-version minor
```
