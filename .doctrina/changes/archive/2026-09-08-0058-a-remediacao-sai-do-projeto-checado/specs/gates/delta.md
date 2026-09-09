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

O gate não muda — ele sempre aceitou qualquer coisa sob `docs/` ou um
README. O que muda é a instrução: ela passa a ser derivada dos diretórios de
documentação que o projeto checado tem, e diz "um README" para quem ainda não
documenta em lugar nenhum. Neste repositório continua nomeando `docs/en/` e
`docs/pt/`, porque aqui os dois existem.

```ops
bump-version minor
append-requirement event: When the documentation gate refuses a change, the system shall name the documentation locations the checked project itself has, and shall name no path or procedure that exists only in Doctrina's own repository.
append-criterion [verified] A project with no documentation is pointed at a README rather than at `docs/en` and `docs/pt`, a project with one documentation directory is pointed at that one, and in this repository both languages are still named — verified by `packages/doctrina-cli/test/portable-remediation.test.js`.
```
