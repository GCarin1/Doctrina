# Change 0251-o-hub-lista-so-o-ciclo-basico-no-perfil-core — o hub lista so o ciclo basico no perfil core

- **Status:** applied
- **Applied:** 2026-11-12
- **Date:** 2026-11-12
- **Owner:** Doctrina maintainers
- **Lane:** chore (confident; signals: upgrade)
- **Affects specs:** templates


## Why

O `AGENTS.md` é lido a cada turno e tem teto de 150 linhas. O bloco gerado gastava 37 delas nomeando 39 comandos, e este repositório estava em 149/150: o próximo comando não cabia. Uma sessão alcança oito. O OpenSpec, que parte de um comando só e deixa o conjunto maior como perfil opcional, mostra que a superfície que o agente vê pode ser menor que a que a ferramenta tem.

## What

- `surfaceMarkdown(profile)`: `full` é o bloco de sempre; `core` nomeia `prime`, `work`, `context`, `close`, `next`, `validate`, `doctor`, `handoff` e remete o resto ao `doctrina --help`.
- `.doctrina/config.json` ganha a opção `surface` (lida por `upgrade`, `doctor`, `validate`).
- `doctrina init --surface core|full`; um projeto novo nasce com `core`.
- Este repositório passa a `core`: o hub vai de 149 para 125 linhas.
- Docs EN/PT (referência do `init`, guia de upgrade), CHANGELOG.

## Scope boundaries

Um projeto existente sem a chave continua com o bloco completo; nada muda num `upgrade`. O `--help` do CLI e o catálogo não mudam. O template do `AGENTS.md` continua embutindo o bloco completo.

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

<!-- doctrina:applied-deltas specs/templates/delta.md=f4ed9177,7ad129b7,d90b5a5b -->
