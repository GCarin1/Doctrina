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

## What changes

Duas metades do mesmo hábito: silêncio lido como aprovação. Cobertura sem
critérios deixa de ser 100% e passa a ser ausência, renderizada como o
`doctor` já renderizava e como o `trace` sempre renderizou a falta de
anchors. E um header que ainda carrega o placeholder do template conta como
ausente, então o escape hatch do `Realizes:` para de vir pré-acionado pelo
scaffold.

```ops
bump-version minor
append-requirement event: When no acceptance criterion is declared, the system shall report coverage as absent rather than as a percentage, and every view shall render that absence identically.
append-requirement unwanted: The system shall not treat a metadata header whose value is still the shipped template's placeholder as a header the author supplied.
append-criterion [verified] A project whose specs declare no criterion reports "no criteria declared" in `status`, `prime`, `report`, `handoff`, `coverage` and its JSON (`pct: null`), never 100%, while one declared criterion still reports a real ratio — verified by `packages/doctrina-cli/test/absence-is-not-approval.test.js`.
append-criterion [verified] An active spec still carrying the scaffold's `Realizes:` placeholder warns, and a deliberate `n/a — <why>` or a real anchor stays silent — verified by `packages/doctrina-cli/test/absence-is-not-approval.test.js`.
```
