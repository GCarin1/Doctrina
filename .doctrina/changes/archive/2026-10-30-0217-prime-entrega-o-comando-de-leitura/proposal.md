# Change 0217-prime-entrega-o-comando-de-leitura — prime entrega o comando de leitura

- **Status:** applied
- **Applied:** 2026-10-30
- **Date:** 2026-10-30
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** insight, templates


## Why

Review de campo: "o `prime` parece orientação suficiente e o `context` fica
para trás". O `prime` terminava num genérico "Read deeper: `doctrina context
[<cap>] --concat`" e o passo 1 do playbook do `work` imprimia `context <cap>
--concat` sem `--for` — justamente a flag que, desde a 0216, recorta o pacote
à tarefa.

## What

- `prime` termina com `Read for <id>: doctrina context <cap> --for
  "<título>" --concat` para a primeira change aberta com delta
  (`capabilities` em `openChanges`).
- Playbook do `work`: passo 1 com `--for "{{FOR}}"` (`forQuery` em
  commands/work.js; token documentado no README dos templates).
- Fixtures; teste `o-prime-entrega-o-comando-de-leitura.test.js`; docs
  EN/PT; CHANGELOG.

## Scope boundaries

- O `--resume` usa o título da change como consulta.

## Verification

<!--
How you will know the change is correctly applied. Use checkboxes: every
box here is a claim that must be PROVEN before the change is done.
`doctrina change archive` refuses to archive while any box below is
unchecked (pass --force to archive anyway and record the gap). Distinguish
"task marked done" from "verification passed" — link the evidence.
-->

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

Nenhuma.
