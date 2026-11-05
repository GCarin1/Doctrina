# Change 0231-o-cartao-leva-o-que-a-change-faz — o cartao leva o que a change faz

- **Status:** applied
- **Applied:** 2026-11-04
- **Date:** 2026-11-04
- **Owner:** Doctrina maintainers
- **Lane:** product (confident; signals: change, aceite)
- **Affects specs:** delivery, authoring, docs


## Why

O cartão é o contexto inteiro do executor (ADR 0030), mas recortava a spec como ela está, antes do apply. O requisito que o executor vai implementar mora no delta, e só chegava ao cartão se o planejador o copiasse à mão. Os critérios de aceite da história moram no arquivo da entrega, no workspace, e as decisões que vinculam a capability não apareciam. Quando nada da spec casava com a tarefa, o cartão saía sem spec nenhuma.

## What

- `lib/task-card.js`: o que o delta faz em cada spec (requisitos e critérios acrescentados, substituídos ou removidos, literalmente), a história da entrega lida do workspace, as decisões aceitas com escopo na capability ou que a citam, e a spec inteira quando nada casa.
- `change card` renderiza as seções novas.
- cli-reference, glossário e multi-agent.md em EN e PT; CHANGELOG.

## Scope boundaries

O cartão não lê ferramentas externas: a história vem do arquivo da entrega, que o planejador já preencheu.

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
