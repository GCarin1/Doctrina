# Change 0213-ciclo-sem-citar-o-framework — ciclo sem citar o framework

- **Status:** applied
- **Applied:** 2026-10-30
- **Date:** 2026-10-30
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** templates, cli


## Why

Review de campo (agente no Cursor, 2026-10-30): o agente sabe que o
Doctrina existe, mas "sem o nome do framework no pedido, o pedido de código
ganha". Mesmo quando o ciclo rodou, pulou o `context` (achou o `prime`
suficiente), o `triage` (que o `work` já faz), o id da change na resposta ao
humano, as skills do projeto, e juntou duas atividades numa change. A regra
do Cursor era só um ponteiro, e o hook por prompt do Cursor não injeta
contexto. A review pede essas linhas sem alongar o AGENTS.md.

## What

- AGENTS.md (template e este repositório): o dia a dia vira o contrato —
  change antes do código, uma por atividade, id na primeira frase, `context
  --for` para a spec, skills exportadas, caminho do arquivo após o `close`;
  a seção de contexto encolhe (148 linhas).
- Regra do Cursor sempre aplicada passa a carregar o ciclo.
- Superfície: `work` classifica a raia sozinho; `triage` é para incidentes.
- Este repositório reaplica os adapters (regra do Cursor, hooks).
- Teste `o-ciclo-vale-sem-citar-o-framework.test.js`; docs EN/PT
  (adapters); CHANGELOG.

## Scope boundaries

- Nenhum comando novo; o `triage` continua existindo.

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
