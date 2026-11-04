# Change 0230-a-orientacao-funciona-na-raiz-do-workspace — a orientacao funciona na raiz do workspace

- **Status:** applied
- **Applied:** 2026-11-04
- **Date:** 2026-11-04
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** cli, insight, structure, workspace, docs


## Why

O planejador trabalha na raiz do workspace. Ali, o `next` mandava rodar `doctrina init` (o que criaria um projeto dentro do workspace) e `handoff`, `status`, `validate` e `context` recusavam com "not a Doctrina project": justamente os comandos que o AGENTS.md manda usar quando não se sabe o que vem a seguir e antes de compactar. Dentro de um repositório, uma sessão nunca sabia que havia uma entrega aberta nele.

## What

- `lib/workspace-view.js` decide o que cada comando diz na raiz: snapshot do workspace, próximas ações, achados de integridade, handoff, status, roteamento de contexto e a linha do prime de um repositório.
- `next`, `handoff`, `status`, `validate` e `context` reconhecem a raiz do workspace; o `prime` de um repositório registrado nomeia o workspace e as entregas abertas.
- Hub gerado aponta `next` e `handoff`; help dos cinco comandos, cli-reference, workspace.md e o guia de ponta a ponta em EN e PT.

## Scope boundaries

Cada projeto continua se validando e lendo seu pacote de contexto dentro de si; a raiz não agrega o validate nem o context dos projetos.

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
