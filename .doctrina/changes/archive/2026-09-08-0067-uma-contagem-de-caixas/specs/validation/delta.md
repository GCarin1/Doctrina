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

## What changes

A gramática de caixa passa a ter um dono no document model
(`parseChecklist` / `checklistProgress`), e os seis leitores que tinham a
própria regex — `snapshot`, `gates`, `analysis`, `validation-model`, o
`context` em dois lugares e o `change tick` — passam a lê-la de lá. Um
placeholder do scaffold é uma caixa, marcada como tal: escondê-lo foi o que
fez "0/3" significar seis.

```ops
bump-version minor
append-requirement ubiquitous: The system shall parse task checkboxes in one module, treating a box with nothing written after it as an unwritten task rather than as no task at all, and every surface that counts or lists boxes shall read that parse.
append-criterion [verified] `prime`, `report`, `handoff` and `next` report the same number of boxes for one change, `change tick` lists exactly the unchecked boxes of the tasks file plus the proposal's Verification section and names which file each came from, and no module outside the document model carries a box regex of its own — verified by `packages/doctrina-cli/test/one-box-count.test.js`.
```
