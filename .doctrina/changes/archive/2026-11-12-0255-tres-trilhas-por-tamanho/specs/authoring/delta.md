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
remove-requirement ubiquitous 10
remove-requirement ubiquitous 3
remove-requirement ubiquitous 2
remove-requirement event 45
remove-requirement event 43
remove-requirement event 42
remove-requirement event 41
remove-requirement unwanted 5
remove-criterion 24
remove-criterion 9
remove-criterion 8
remove-criterion 7
remove-criterion 5
remove-criterion 4
set-header Source: `packages/doctrina-cli/src/commands/{intake,work,spec,change,decision,contract,skill,intent}.js`, `packages/doctrina-cli/src/lib/{change-ops,change-numbers,applied-deltas,spec-ops,work-model,intake-model,code-inventory,lexicon,adr-guard,criteria,names}.js`
bump-version minor
```
