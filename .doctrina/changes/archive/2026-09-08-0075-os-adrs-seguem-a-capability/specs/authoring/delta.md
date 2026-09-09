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

## What changes

`Scope:` passa a decidir ordem além de candidatura: um ADR que **nomeia** a
capability supera um que só a alcança por dependência, que por sua vez supera um
global. E o `validate` passa a reportar a deriva que uma divisão de spec produz —
uma spec citando um ADR que não a nomeia.

Medido neste repositório: treze violações antes, zero depois; os sete ADRs que a
spec `authoring` cita passam a sobreviver ao pacote dela, e o que é descartado
sob pressão são as decisões que ela não cita.

```ops
bump-version minor
append-requirement ubiquitous: The system shall rank an accepted decision that names a capability in its `Scope:` header above one that reaches that capability only through a declared dependency, and both above an unscoped decision, when assembling that capability's context pack.
append-requirement event: When a capability spec cites a decision whose `Scope:` header does not name that capability, the system shall report it, naming the header to extend.
append-criterion [verified] Every decision this repository's specs cite names the citing capability, the `authoring` pack keeps all of them, a decision that names a capability outranks one it only inherits even when its number is older, and an unscoped decision is never reported as a violation — verified by `packages/doctrina-cli/test/adr-scope-follows-capability.test.js`.
```
