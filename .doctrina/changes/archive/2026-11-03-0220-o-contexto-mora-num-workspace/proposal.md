# Change 0220-o-contexto-mora-num-workspace — o contexto mora num workspace

- **Status:** applied
- **Applied:** 2026-11-03
- **Date:** 2026-11-03
- **Owner:** Doctrina maintainers
- **Lane:** product (confident; signals: registrar)
- **Affects specs:** workspace, cli

- **Documented surface:** `doctrina workspace init`, `doctrina workspace add`, `doctrina workspace attach`, `doctrina workspace detach`, `doctrina workspace list` — documented in `docs/en/cli-reference.md` and `docs/pt/cli-reference.md`


## Why

Uma entrega real atravessa até quatro repositórios (front-core, front-feature, back-end, app), e o Doctrina só conhecia um: o `.doctrina/` ao lado do código, lido a partir do diretório atual. Um orquestrador não tinha onde saber quais repositórios existem, o que cada um é e de quem depende.

Além disso, nem todo repositório pode carregar `.doctrina/`: em parte deles o time não autoriza a pasta, ou o operador não tem permissão de commit. Sem um lugar para esse contexto, o agente reabsorve o código a cada sessão e nada fica versionado.

## What

- Novo comando `doctrina workspace init|add|attach|detach|list` (`src/commands/workspace.js`), com as decisões em `src/lib/workspace.js` (ADR 0025).
- Um workspace é um diretório com `workspace.json`, `projects/` e `deliveries/`, criado como repositório git privado (ADR 0029).
- Um repositório sem `.doctrina/` vira sombra: os artefatos nascem em `projects/<nome>/`, são ligados ao repositório (link de diretório para `.doctrina/`, link de arquivo para o resto, link físico ou cópia como alternativa) e escondidos do git dele por um bloco em `.git/info/exclude`.
- Nova spec `workspace`; a moment "Orchestrate" entra no bloco gerado do AGENTS.md como linha compacta, para caber no orçamento de 40 linhas.
- Docs EN/PT da referência, contadores, CHANGELOG e o README do pacote.

## Scope boundaries

- A absorção de um projeto existente (`intake --from-code`) é a change seguinte; aqui o `list` só aponta para ela.
- Entregas, cartões de tarefa, registro de ferramentas e agentes gerados ficam para as changes seguintes da 0.20.
- Nenhum comando existente muda: dentro do repositório o `.doctrina/` sombra é lido pelo link.

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
