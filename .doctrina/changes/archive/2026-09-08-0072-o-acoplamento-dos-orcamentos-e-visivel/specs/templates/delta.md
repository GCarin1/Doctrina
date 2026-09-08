# Spec Delta — capability: templates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/templates/spec.md`

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

```ops
append-requirement ubiquitous: The system shall resolve every declared size budget from the project's contract, falling back to the shipped default only when the project declares none, so one ceiling is never read from two places.
append-requirement state: While the generated surface block is written into AGENTS.md, the system shall treat the two size budgets as coupled and report the smaller of their two slacks as the remaining headroom.
append-criterion [verified] The headroom left in the two coupled budgets is reported before either is breached, and the overflow warning still fires once one is past — verified by `packages/doctrina-cli/test/coupled-budgets.test.js`.
append-criterion [verified] `doctor` and `templates check` quote one size for the surface block, and a ceiling declared in the contract beats the shipped literal for both budgets — verified by `packages/doctrina-cli/test/coupled-budgets.test.js`.
bump-version minor
```
