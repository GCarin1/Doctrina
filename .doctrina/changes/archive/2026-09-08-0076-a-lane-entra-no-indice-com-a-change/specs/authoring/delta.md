# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

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
append-requirement ubiquitous: The system shall build every index entry for an artifact through one constructor per record shape, so a command that registers an artifact and the command that rebuilds the index can never disagree about its fields.
append-requirement event: When `doctrina work` opens a change, the system shall register its index entry only after the proposal is fully written — lane and affected specs stamped — so the tree it leaves passes `doctrina validate` without a rebuild.
append-criterion [verified] `doctrina work` followed by `doctrina validate` exits 0 on a freshly initialised project, with the classified lane present in the index entry — verified by `packages/doctrina-cli/test/one-change-entry.test.js`.
append-criterion [verified] The entry the writer stores equals the one the deriver builds, and re-deriving it replaces rather than duplicates — verified by `packages/doctrina-cli/test/one-change-entry.test.js`.
bump-version minor
```
