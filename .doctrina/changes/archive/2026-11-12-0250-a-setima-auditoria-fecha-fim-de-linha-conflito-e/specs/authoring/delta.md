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
To take one out: `remove-requirement <section> <n>` / `remove-criterion <n>`
(the criteria after it renumber; write removals highest number first).
append-* ops resolve numbering/position at APPLY time, so several open
changes appending to the same spec never collide on numbers — order of
application decides.

For REMOVED: the body may be empty; on apply, the target spec file is
deleted and the capability is recorded in the change archive only.
-->

---

<!-- delta body below -->

```ops
replace-requirement ubiquitous 17: The system shall number a new change past every id the ledger records, abandoned ones included, and past every number another `doctrina work` running at the same moment takes.
replace-criterion 58: [verified] a watching script is listed as not seeded, and the flags that make a runner return are seeded; a Python unit is seeded with the linter and the type checker it declares and with nothing it does not; `change renumber` leaves a longer id that starts the same untouched — verified by `packages/doctrina-cli/test/a-segunda-auditoria-fecha-o-fluxo-multi-repo.test.js` and `packages/doctrina-cli/test/a-setima-auditoria-fecha-fim-de-linha-conflito-e-concorrencia.test.js`.
bump-version patch
```
