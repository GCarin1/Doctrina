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

`doctor` is a driver, and a driver ASKS its collectors. Three of its rows
answered by starting this binary again and parsing its own JSON back; the
checks they wanted now live in `lib/`, where the gate that renders them and
the diagnostic that reports them read the same collection.

```ops
replace-requirement event 32: When `doctrina doctor` runs, the system shall drive the diagnostic set — the structural checks, the index drift check, the coverage/trace ratios, the clean-checkout lint, the template shape, the runtime surface, and the verify-config presence — by reading each as a collection IN THE SAME PROCESS, reporting each area with its exact remediation command, adding no checks of its own, and exiting 1 when any area fails (advisory findings stay exit 0).
append-requirement event: When a check is rendered by one command and reported by another, the system shall express it once as a collection under `lib/` and let both read it, so that no command starts a second process to ask a question this one can answer.
append-requirement unwanted: The system shall not report a diagnostic row by running its own binary and parsing that output, and shall not repair the tree from a read-only diagnostic; a declared row with no reporter shall be reported unchecked, never silently skipped.
append-criterion [verified] A whole `doctor` run is one CLI invocation — proved by the usage log, which recorded four before this — and its rows agree with the commands that render the same collections — verified by `packages/doctrina-cli/test/doctor-in-process.test.js`.
bump-version minor
```
