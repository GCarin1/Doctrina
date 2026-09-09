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

Prosa e caminho passam a ser distinguidos sem adivinhação, e a mesma regra
vale nos dois comandos que ingerem uma descrição — o `intake` no positional
dele e o `init` no `--intake` —, então um agente que aprendeu um não é
surpreendido pelo outro. A regra é conservadora de propósito: qualquer coisa
que possa ser um caminho é tratada como caminho, para que um arquivo real
nunca seja lido como descrição.

Nenhuma das duas formas explícitas muda, e o erro de arquivo inexistente
continua existindo — agora nomeando a forma que teria funcionado.

```ops
bump-version minor
append-requirement event: When a description is given where a file path is expected, the system shall accept it as the description when it cannot be a path, and shall otherwise report the missing file naming the form that passes text directly.
append-requirement ubiquitous: The system shall apply one rule for telling a path from prose, and the commands that ingest a project description shall answer the same input shape the same way.
append-criterion [verified] The description passed directly is stored verbatim with a note naming the explicit form, a missing path is still an error that names that form, a real file is never read as prose, and `init` answers all three the same way — verified by `packages/doctrina-cli/test/intake-accepts-prose.test.js`.
```
