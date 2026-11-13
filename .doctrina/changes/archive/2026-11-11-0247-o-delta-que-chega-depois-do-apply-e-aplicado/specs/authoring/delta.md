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
append-requirement event: When `doctrina change apply` runs on a change already stamped `applied`, the system shall apply the deltas and the ops its record in `proposal.md` does not name, each once, and shall refuse with exit 1 when an op the record names changed or is gone; a change with no record shall be left as it is.
append-criterion [verified] After a close that applied and stopped at a later gate, an op added to the same delta and a delta added for another capability are applied by the next close exactly once, with one version bump; an applied op that was edited stops the apply with nothing written; an applied change with no record answers "already applied" — verified by `packages/doctrina-cli/test/o-delta-que-chega-depois-do-apply.test.js`.
set-header Source: `packages/doctrina-cli/src/commands/{intake,work,spec,change,decision,contract,skill,intent,triage}.js`, `packages/doctrina-cli/src/lib/{change-ops,change-numbers,applied-deltas,spec-ops,work-model,triage-model,intake-model,code-inventory,lexicon,adr-guard,criteria,names}.js`
bump-version minor
```
