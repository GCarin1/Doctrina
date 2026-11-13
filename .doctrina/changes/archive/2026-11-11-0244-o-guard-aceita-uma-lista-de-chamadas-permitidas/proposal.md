# Change 0244-o-guard-aceita-uma-lista-de-chamadas-permitidas — o guard aceita uma lista de chamadas permitidas por ferramenta

- **Status:** applied
- **Applied:** 2026-11-11
- **Date:** 2026-11-11
- **Owner:** Doctrina maintainers
- **Lane:** product (confident; signals: declarar)
- **Affects specs:** workspace


## Why

A guarda decide se uma chamada MCP escreve pelo nome e pela entrada dela: uma lista de verbos. A quarta auditoria acrescentou quarenta verbos depois que servidores reais passaram por leitura, e o próximo servidor traz um verbo que a lista nunca viu — uma chamada que ninguém reconhece é permitida. Para um ambiente estrito (Jira, banco de produção) falta o modo inverso: o que não foi nomeado não passa.

## What

- `doctrina workspace tool <nome> --only "<chamadas>"` guarda a lista de chamadas permitidas na ferramenta (`*` casa qualquer trecho; `none` tira a lista).
- `guardDecision` nega toda chamada pelo servidor que nenhuma lista nomeia, com o comando que a acrescentaria; a chamada nomeada segue para o julgamento por acesso.
- A lista aparece no `workspace list` e nos arquivos gerados para os agentes.
- Docs EN/PT (workspace, referência), CHANGELOG.

## Scope boundaries

Sem lista, o comportamento é o de antes. A guarda continua cobrindo só chamadas MCP; um agente com shell fora dela não é assunto desta change.

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
