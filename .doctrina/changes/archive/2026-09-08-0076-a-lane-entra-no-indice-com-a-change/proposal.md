# Change 0076-a-lane-entra-no-indice-com-a-change — a lane entra no indice com a change

- **Status:** applied
- **Applied:** 2026-09-08
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain; signals: change)
- **Affects specs:** authoring

## Why

o doctrina work grava a entrada do indice sem a lane enquanto o rebuild deriva a lane da proposta, e ainda carimba a lane depois de indexar, entao toda change aberta deixa o validate errando na hora

## What

`packages/doctrina-cli/src/lib/change-ops.js:73` grava a entrada da change no
índice com quatro campos — `id`, `title`, `path`, `status`, `opened`. O
`packages/doctrina-cli/src/lib/scan.js:203` deriva um quinto, `lane`, lendo o
header `- **Lane:**` da proposta (change 0042). Os dois nunca combinam, e o
`validate` compara um contra o outro:

```
$ doctrina work "..." --title "..."
$ doctrina validate
error: index.json: changes "0001-..." metadata differs from its file
```

Pior que a omissão: a ORDEM torna a omissão inevitável. O `work.js` chama
`changeNew` na linha 138 e só carimba a lane na 154 — no instante em que o
índice é escrito, a proposta ainda não tem lane nenhuma para ler.

O `change new` sozinho não derrapa (deixa `- **Lane:**` vazio, e o `scan`
trata ausência como desconhecido). Quem derrapa é o `work` — o comando que o
AGENTS.md manda usar para toda requisição. Toda change aberta nesta sessão
custou um `index rebuild` que ninguém pediu.

A saída é a mesma que a change 0065 usou no `decision accept`: quem escreve a
entrada não a monta a mão, deriva do artefato em disco pelo mesmo código que o
`rebuild` usa — e deriva DEPOIS de a proposta estar completa.

## Scope boundaries

- Não muda o formato da entrada no índice nem a semântica da lane: o campo
  continua opcional e ausência continua significando desconhecido.
- Não mexe no classificador de lane (`triage`), só em quando o que ele decidiu
  chega ao disco.

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
- [x] Um `doctrina work` seguido de `doctrina validate` num projeto limpo sai 0.
- [x] O `change new` sem lane continua sem drift.
- [x] O escritor da entrada e o `rebuild` derivam do mesmo lugar.

## Open questions

- Nenhuma.
