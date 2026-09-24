# Change 0187-upgrade-aponta-slash-commands-defasados — upgrade aponta slash commands defasados

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:** Doctrina maintainers
- **Lane:** product
- **Affects specs:** templates


## Why

A auditoria antes da 0.17 simulou a migração: um projeto criado pela
0.16.0 com o adapter do Claude Code, atualizado pelo CLI atual. O
`upgrade` regenerou o bloco de superfície do AGENTS.md e disse que não
havia mais nada a fazer, mas o `/doctrina-work` instalado continuava
mandando rodar `doctrina analyze <id>` → `doctrina change apply <id>`
antes do close. O agente do usuário seguiria o fluxo antigo sem ninguém
avisar. Na mesma simulação, o `change check` ainda intitulava a primeira
seção "structure (analyze)".

## What

- `collectFindings` (lido por `upgrade` e `templates check`) examina os
  shims de comando instalados e reporta o que nomeia um comando
  depreciado ou removido, com o conserto `adapter add <agente> --force`.
- A primeira seção do `change check` passa a se chamar `structure`.
- Teste `o-upgrade-ve-o-slash-command-defasado.test.js`.

## Scope boundaries

- O `upgrade --write` não reescreve o shim sozinho: o arquivo pode ter
  edições do usuário, e o conserto que o sobrescreve fica nomeado para
  quem decide.

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

