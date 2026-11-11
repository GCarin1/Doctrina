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
append-requirement ubiquitous: The system shall number a new change past every change another branch added in the last 180 days, as far as the git history of the clone records one.
append-requirement event: When `doctrina change renumber <id>` runs on an open change, the system shall move its folder to the next free number, rewrite the id in the Markdown files of that change and derive the index again; an id that is not an open change shall exit 2.
append-requirement event: When `doctrina validate` runs and an open change shares its number with another change, the system shall warn, naming `doctrina change renumber <id>` for one of the two — the same one from either side.
append-criterion [verified] A change opened on `main` takes 0002 when a branch the clone knows already added 0001; two open changes under one number are named by `validate` for the one that sorts last, and `change renumber` moves it to the next free number with its title lines rewritten and the index in step — verified by `packages/doctrina-cli/test/branches-paralelas-se-juntam.test.js`.
set-header Source: `packages/doctrina-cli/src/commands/{intake,work,spec,change,decision,contract,skill,intent,triage}.js`, `packages/doctrina-cli/src/lib/{change-ops,change-numbers,spec-ops,work-model,triage-model,intake-model,code-inventory,lexicon,adr-guard,criteria,names}.js`
bump-version minor
```
