# Change 0104-os-ordinais-do-tick-sao-estaveis — os ordinais do tick sao estaveis

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product
- **Affects specs:** authoring

## Why

os ordinais do change tick são posições entre as caixas ainda abertas e mudam a cada tick; ticks sequenciais marcaram closing steps e a verificação da proposta; bullets com asterisco são invisíveis

## What

O `change tick` numerava só as caixas ABERTAS e renumerava depois de cada
tick. Medido num projeto limpo com 5 tarefas, 3 closing steps e 2 itens de
Verification: `tick 1`, `tick 2`, `tick 3`, `tick 4` em quatro chamadas
marcaram a tarefa 1, depois **«Apply the change»**, **«Update index.json»**
e **«acceptance criteria are met»** — os closing steps e as alegações de
verificação da proposta — e deixaram as tarefas 2–4 abertas. Uma caixa é
uma alegação; o número que a nomeia não pode mudar entre duas chamadas.

Agora os ordinais correm sobre TODAS as caixas em ordem de leitura,
marcadas ou não: a listagem mostra o estado de cada uma, uma caixa já
marcada é um no-op nomeado, e um argumento que não é número é recusado
pelo nome («no box "abc"»), não como `#NaN`.

A segunda metade: `* [ ] tarefa` não era caixa para a gramática, então o
`tick` não a marcava e o gate de archive não a contava — uma tarefa aberta
que fechava verde. Qualquer bullet Markdown (`-`, `*`, `+`) abre uma caixa,
no modelo de documento que todos leem.

## Scope boundaries

- Não muda o que `--all` faz: continua marcando só o que está aberto.
- Não muda a recusa de placeholder (`- [ ]` sem texto).
- Não muda a ordem de leitura (tasks.md, depois `## Verification`).

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
- [x] `tick 1`, `tick 2`, `tick 3`, `tick 4` em chamadas separadas marcam as tarefas 1–4 e nada mais.
- [x] Um bullet `*`/`+` é caixa para o `tick` e para o gate de archive.
- [x] `tick <id> abc` sai 2 e nomeia o argumento.

## Open questions

- Nenhuma.
