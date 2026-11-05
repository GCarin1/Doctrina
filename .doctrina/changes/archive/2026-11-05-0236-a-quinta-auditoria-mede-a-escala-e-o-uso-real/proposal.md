# Change 0236-a-quinta-auditoria-mede-a-escala-e-o-uso-real — a quinta auditoria mede a escala e o uso real

- **Status:** applied
- **Applied:** 2026-11-05
- **Date:** 2026-11-05
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** cli, workspace, gates, templates, docs


## Why

A quinta auditoria mediu o que as anteriores não mediram: escala, latência e um agente real conduzindo a entrega. O `doctrina workspace guard` roda antes de cada chamada MCP de um agente e carregava o CLI inteiro (39 comandos, o snapshot do projeto, o git) para ler um registro: cerca de 220 ms por chamada, contra 30 ms do Node. Na raiz de um workspace com 40 entregas abertas, o `next` imprimia 162 linhas no contexto do planejador. E um planejador real (`claude -p`) conduzindo a SHOP-42 em dois repositórios sombra tropeçou em dois pontos: o `review` sem `--change` chamou de quebra a spec que uma change aberta ia atualizar, e as specs escritas à mão deixaram o índice dessincronizado, um erro que o playbook de absorb não mandava curar.

## What

- `index.js` carrega só o comando que roda; `workspace guard` vai direto para `lib/workspace-guard.js`, que alcança seis módulos.
- `lib/workspace-locate.js` (achar e ler o workspace) separado de `lib/workspace.js`, que o reexporta.
- O `next` na raiz imprime as dez primeiras ações e conta o resto; o `--json` traz todas.
- O `review` sem `--change` registra como nota, com o nome da change, a capability que uma change aberta vai atualizar.
- O playbook de absorb roda `doctrina validate --fix` entre os gates.
- Testes, cli-reference EN e PT, CHANGELOG.

## Scope boundaries

A latência foi medida nesta máquina (Linux): o guard caiu de cerca de 220 ms para cerca de 90 ms por chamada. A garantia nos testes é estrutural (o grafo de imports da porta do guard), não o tempo, que depende da máquina.

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
