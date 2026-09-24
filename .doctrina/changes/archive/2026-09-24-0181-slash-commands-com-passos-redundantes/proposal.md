# Change 0181-slash-commands-com-passos-redundantes — slash commands com passos redundantes

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:**
- **Lane:** product
- **Affects specs:** templates

- **Documented surface:** n/a — só o texto dos slash commands instalados; nenhum comando ou flag muda

## Why

Os comandos `/doctrina-work` que os adapters do Claude Code e do Cursor instalam no projeto do usuário mandavam o agente rodar `doctrina analyze <id>` → `doctrina change apply <id>` e **depois** `doctrina close <id>`. São dois passos que o próprio `close` executa, ensinados como pré-requisito manual, justo no arquivo que o agente lê quando a pessoa digita o slash command. Não quebrava nada (o `close` retoma de onde o apply parou), mas ensinava um fluxo diferente do playbook e do `AGENTS.md`, e dependia do `analyze`, que a change 0182 vai depreciar.

## What

- `.doctrina/templates/adapters/{claude,cursor}/…/doctrina-work.md.template`: o passo manual vira `doctrina change check <id>`, a prévia do `close`; o `close` continua sendo o passo final.
- As cópias instaladas neste repositório (`.claude/commands/doctrina-work.md`, `.cursor/commands/doctrina-work.md`) recebem a mesma edição, e são iguais ao template renderizado.

## Scope boundaries

- Projetos que já instalaram esses adapters mantêm a cópia antiga até rodar `doctrina adapter add <agente> --force` (o `--force` reescreve os arquivos daquele adapter); o `upgrade` só avisa quando um ponteiro deixa de citar o AGENTS.md.

## Verification

- [x] `packages/doctrina-cli/test/os-slash-commands-fecham-pelo-close.test.js` passa e falha nos templates anteriores.
- [x] As cópias instaladas no repositório são iguais ao template renderizado (`diff` vazio, Claude Code e Cursor).
- [x] Automated checks pass (`doctrina verify`).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

Nenhuma.
