# Change 0238-o-cursor-recebe-skills-e-o-guard-falha-fechado — o Cursor recebe skills e o guard falha fechado

- **Status:** applied
- **Applied:** 2026-11-05
- **Date:** 2026-11-05
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** templates, scaffolding, workspace, docs


## Why

A sexta auditoria leu a documentação atual do Cursor: ela descreve skills (`.cursor/skills/<nome>/SKILL.md`, com `name` igual à pasta) e não documenta mais `.cursor/commands/`; o Cursor 2.4 converte comandos em skills com `disable-model-invocation: true`. E o Cursor deixa uma chamada MCP passar quando um hook quebra ou não consegue iniciar, a menos que o hook declare `failClosed`: um guard que não pôde rodar (basta o `doctrina` fora do PATH do Cursor) deixava uma ferramenta só leitura escrever, em silêncio. O usuário pediu as duas correções recomendadas.

## What

- Os cinco comandos do core loop do adaptador cursor passam a ser skills em `.cursor/skills/doctrina-*/SKILL.md`, com `name`, `description` e `disable-model-invocation: true`.
- `lib/adapters.js` declara os arquivos aposentados e planeja a migração: grava a skill que falta, remove cada comando ainda como a CLI o escreveu, mantém e nomeia o editado; `doctrina upgrade --write` e `adapter add` a aplicam.
- Num repositório sombra, a migração grava na sombra e `relinkShadow` (em `lib/workspace.js`) religa o repositório, tira os links pendurados e reescreve o exclude.
- O hook do guard no Cursor leva `failClosed: true` enquanto o workspace declara uma ferramenta, com uma única entrada.
- Este repositório migrado com `upgrade --write`; testes, docs EN e PT, README de templates, spec de templates, CHANGELOG.

## Scope boundaries

O adaptador claude continua com `.claude/commands/`, que o Claude Code lê. O `failClosed` vale só para o Cursor: o Claude Code não tem opção equivalente documentada para PreToolUse.

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
