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

A régua que a change 0057 aplicou a um header — um valor ainda entre `<…>` é
um valor que ninguém escreveu — passa a existir para o corpo de uma seção
(`isUnwrittenSection`, no document model) e é aplicada ao critério de
aceitação que o `spec new` traz.

```ops
bump-version minor
append-requirement ubiquitous: The system shall recognise, in one place, a section body that is still the shipped template — empty, only its instructional comment, or only a placeholder — and every module that must tell the mould from authored content shall use it.
append-requirement event: When a capability spec carries an acceptance criterion still in the scaffold's placeholder form, the system shall report it, saying that its cited proof resolves nowhere.
append-criterion [verified] A section that is only the template's annotation is unwritten and one with a line of prose is not, every accepted decision in this repository is written, and a scaffolded criterion is reported while a written one citing real proof is silent — verified by `packages/doctrina-cli/test/the-mould-is-not-content.test.js`.
```
