# Spec Delta — capability: insight

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/insight/spec.md`

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

`constitution` and `prime --rules` are one rendering with two names. The
standing rules become a view of the shared collection, and the older name
keeps working while it is retired.

```ops
replace-requirement event 4: When `doctrina prime --rules` runs — or the deprecated `doctrina constitution`, which prints the same lines — the system shall print the project's standing rules in full: every accepted ADR by number and title, and every non-goal declared in product.md, assembled read-only from the artifacts that own them.
append-requirement event: When `doctrina prime` runs without `--rules`, the system shall keep the primer a fixed-size read: the accepted ADRs by title and the number of non-goals, never their full text.
append-criterion [verified] `constitution` and `prime --rules` produce byte-identical output, and the primer names the ADRs without printing the non-goal text — verified by `packages/doctrina-cli/test/deprecation.test.js`.
bump-version minor
```
