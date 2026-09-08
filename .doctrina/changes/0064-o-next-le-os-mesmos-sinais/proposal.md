# Change 0064-o-next-le-os-mesmos-sinais — o next le os mesmos sinais

- **Status:** proposed
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** cli

## Why

o next responde sem trabalho aberto sobre a mesma arvore em que o doctor reporta cinco pendencias com remedio nomeado, e oferece as duas portas de autoria manual que o AGENTS.md manda o agente nao usar

## What

Mesmo projeto, mesmo instante: o `doctor` reporta cinco pendências com remédio
nomeado e o `next` responde `ok no open work`. O comando cuja função inteira é
responder «e agora?» é o que responde «nada».

O `computeActions` cobre o ciclo de vida de change, ADR, índice, intake, runtime
e skill — onze ações. Nenhuma sobre sinal de gate: cobertura furada, evidência
dangling, gate de build não declarado, spec `active` ainda `planned`.

A consequência é maior que a estética. Um projeto adotante que nunca rodou
`verify --init` fecha changes para sempre com o passo 7 do `close` em `skip` — o
gate de build real nunca executa — e o comando que deveria avisar diz que não há
o que fazer. A change 0037 unificou as vistas para que não pudessem discordar; o
`next` ficou de fora dessa unificação.

E as duas saídas que ele oferece no estado vazio são `change new` e `spec new`,
as duas portas de autoria manual que o `AGENTS.md` manda o agente não usar.

## Scope boundaries

- Não transforma advertência em erro: o `next` recomenda, não reprova; o código
  de saída dele não muda.
- Não duplica a lógica dos gates: as ações saem da mesma coleção que o `doctor` e
  o `status` já leem, numa leitura por invocação.
- Não reordena as ações que já existem.

## Verification

<!--
How you will know the change is correctly applied. Use checkboxes: every
box here is a claim that must be PROVEN before the change is done.
`doctrina change archive` refuses to archive while any box below is
unchecked (pass --force to archive anyway and record the gap). Distinguish
"task marked done" from "verification passed" — link the evidence.
-->

- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

- Nenhuma.
- [ ] Numa árvore em que o `doctor` avisa, o `next` recomenda — e sobre os mesmos sinais.
- [ ] Um projeto sem `verify.json` é dito, pelo `next`, que precisa declarar o gate de build.
- [ ] O estado genuinamente vazio aponta para `intake` ou `work`, não para as portas de autoria manual.
- [ ] Um teste compara as duas saídas na mesma árvore, e não contra uma lista literal.
