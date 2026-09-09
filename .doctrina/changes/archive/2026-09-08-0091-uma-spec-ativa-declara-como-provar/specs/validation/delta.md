# Spec Delta — capability: validation

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/validation/spec.md`

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
append-requirement unwanted: If a capability spec is active and declares no acceptance criterion, the system shall not report the tree as structurally sound, because a capability that states what the system must do and nothing about how anyone would know it does cannot be proven.
append-criterion [verified] An active spec with no criteria fails the structural gate, whether the section is empty or absent, while a draft spec with none still passes — verified by `packages/doctrina-cli/test/an-active-spec-says-how-to-prove-it.test.js`.
append-criterion [verified] An active spec that declares criteria passes, and `clarify`, `doctor` and `validate` reach the same verdict on the same tree — verified by `packages/doctrina-cli/test/an-active-spec-says-how-to-prove-it.test.js`.
bump-version minor
```
