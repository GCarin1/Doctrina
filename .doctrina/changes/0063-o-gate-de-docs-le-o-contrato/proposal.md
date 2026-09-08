# Change 0063-o-gate-de-docs-le-o-contrato — o gate de docs le o contrato

- **Status:** proposed
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain; signals: change)
- **Affects specs:** gates

## Why

o gate de docs so reconhece superficie escrita no vocabulario do proprio doctrina: num projeto adotante um comando novo, um endpoint http publico, uma variavel de ambiente renomeada e uma chave de configuracao produzem zero sinais e a change fecha sem documentacao nenhuma

## What

O gate de docs é bloqueante no `close` e existe para uma coisa: uma change que
altera superfície documentada só fecha com a documentação junto. Ele reconhece
um comando comparando com `COMMAND_NAMES` — **o catálogo do próprio Doctrina**.
Fora deste repositório quase nada é superfície. Medido contra
`documentedSurfaceSignals`, cinco changes de formato adotante:

| change | sinais |
|---|---|
| adiciona um comando de CLI (sem flag) | 0 |
| adiciona um endpoint HTTP público | 0 |
| renomeia uma variável de ambiente | 0 |
| muda uma chave de configuração | 0 |
| muda um código de saída | 1 (`exit codes`) |

Um endpoint público novo fecha sem uma linha de documentação e sem uma queixa. É
a mesma família dos achados A2 e A6 da auditoria anterior: o gate é máximamente
sensível dentro do repositório de quem o escreveu e inerte para quem adota.

O vocabulário já existe e está no lugar certo. O contrato do projeto declara
Ports, Environment, Wiring, Selectors e Interfaces — a superfície de integração
declarada pelo próprio projeto, exatamente como o ADR 0023 decidiu para o
runtime. O gate passa a lê-lo em vez de trazer o catálogo do Doctrina embutido.

Junto vai o outro lado da mesma moeda: a dica que a change 0058 tornou portátil
ficou ruidosa. Neste repositório ela nomeia cinco lugares, um deles
`docs/assets/` — um diretório de SVG com zero Markdown. Só é casa de
documentação um diretório que contém prosa.

## Scope boundaries

- Não endurece o gate: o que ele aceita como documentação — qualquer coisa sob
  `docs/` ou um README — não muda.
- Não obriga ninguém a ter contrato: um projeto sem `.doctrina/contracts/`
  mantém o comportamento de hoje, com o catálogo do Doctrina como último
  recurso, e o gate segue silencioso onde não consegue ver.
- Não mexe no `contract check` nem nos checks RT01-RT05.

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
- [ ] Num projeto adotante, um comando novo, um endpoint declarado no contrato e uma variável de ambiente declarada produzem sinal.
- [ ] Um projeto sem contrato mantém exatamente o comportamento de hoje.
- [ ] A dica não nomeia diretório sem Markdown.
- [ ] Os testes rodam contra uma árvore que o próprio CLI criou, não contra este repositório.
