# Change 0195-closing-steps-saem-do-tasks — closing steps saem do tasks

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:** Doctrina maintainers
- **Lane:** product
- **Affects specs:** authoring


## Why

O `tasks.md` de toda change terminava com "## Closing steps": aplicar os
deltas, arquivar a pasta, atualizar o índice. O gate de arquivamento
exigia essas caixas marcadas, e o playbook mandava marcá-las antes do
`close`, o comando que executa exatamente esses três passos. O agente
tinha de afirmar três coisas que ainda não tinham acontecido. Achado ao
percorrer o fluxo como um usuário novo. `collectArchiveBlockers`, um
segundo contador de caixas com regex própria, estava morto em
`change.js`.

## What

- O template do `tasks.md` não traz mais "## Closing steps"; o comentário
  diz que o `close` aplica, arquiva e indexa.
- `checklistProgress` deixa de fora uma lista antiga de "## Closing steps"
  (changes abertas antes desta); `parseChecklist` registra a seção de cada
  caixa, e o `change tick` continua numerando todas.
- Passo 7 do playbook de work (goldens regravados), cli-reference e
  getting-started EN/PT.
- `collectArchiveBlockers` removido.
- Testes ajustados em `one-box-count` e `a-box-keeps-its-number`.

## Scope boundaries

- As caixas da `## Verification` da proposal continuam contando.

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

