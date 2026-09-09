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

A change 0029 decidiu que uma superfície de runtime não declarada é
REPORTADA, nunca aprovada. A linha por contrato obedecia; a linha de resumo
— a que fica no log de CI e a que o `close` imprime — não. Ela passa a
carregar a contagem, e a palavra "consistent" só aparece quando houve algo
para verificar.

```ops
bump-version minor
append-requirement event: When `contract check` finishes with no error, the system shall report in its summary line how many contracts declared no Wiring or Selectors rows, and shall exit 0.
append-requirement unwanted: The system shall not describe a contract set as consistent in the summary of `contract check` when no Wiring or Selectors row was declared to check.
append-criterion [verified] A scaffolded contract produces a summary that names the unchecked runtime surface and never the word "consistent"; a contract whose declared wiring holds produces both the consistency and the row count; and `contract check`, `doctor` and `triage` describe the same undeclared state the same way — verified by `packages/doctrina-cli/test/runtime-commands.test.js`.
```
