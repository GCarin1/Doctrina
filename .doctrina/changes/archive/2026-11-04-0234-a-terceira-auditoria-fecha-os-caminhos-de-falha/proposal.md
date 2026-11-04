# Change 0234-a-terceira-auditoria-fecha-os-caminhos-de-falha — a terceira auditoria fecha os caminhos de falha

- **Status:** applied
- **Applied:** 2026-11-04
- **Date:** 2026-11-04
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain; signals: change)
- **Affects specs:** workspace, delivery, authoring, cli, scaffolding, docs


## Why

A terceira auditoria quebrou o fluxo multi-repo de propósito, do jeito que ele quebra no dia a dia: uma change abandonada dentro de uma entrega, um projeto tirado do roteamento com trabalho aberto, um repositório que mudou de lugar, um segundo clone de um repositório sombra, um executor aberto dentro do repositório com uma ferramenta declarada só leitura, uma change sem nenhuma tarefa escrita e um agente lendo `--json` de um comando que falhou. Em cada caso o Doctrina dava a resposta errada: deixava a chamada MCP passar sem guarda, mandava entregar cartões que não existiam, esquecia a change abandonada, deixava a change órfã, mandava `cd` para um caminho inexistente, mandava `init` num repositório que não pode carregar `.doctrina/`, ou respondia em inglês a quem pediu JSON.

## What

- O hook do guard vai para os arquivos de hook de cada sombra; o `validate` na raiz avisa de um projeto in-repo sem guard.
- Placeholders do scaffold não contam como tarefas a entregar: o cartão, o `next` do repositório e o da raiz e o `delivery status` mandam para `doctrina work --resume`.
- O `change abandon` grava a entrega no ledger; a entrega mostra a change abandonada e propõe o re-roteamento; a numeração das changes conta os ids do ledger.
- O `delivery route` recusa tirar um projeto com change aberta da entrega sem `--force`; o `validate` avisa de change órfã; projeto já com change não recebe a linha de `work`.
- Repositório ausente aparece como movido, com `workspace attach --path`.
- Clone de repositório sombra: `next`, o erro de não-projeto e o `init` nomeiam `workspace attach --path`.
- `--json` responde com o envelope e `error` quando o comando falha antes do payload; `delivery status --json` tem payload próprio.
- Teste novo, cli-reference EN e PT, ajuda de delivery e init, CHANGELOG.

## Scope boundaries

O clone de um repositório sombra é reconhecido pelo remote `origin` do git; um clone sem `origin` continua sem ser reconhecido. O guard de um projeto in-repo não é escrito pelo workspace, só avisado, porque os arquivos de hook são do projeto.

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
