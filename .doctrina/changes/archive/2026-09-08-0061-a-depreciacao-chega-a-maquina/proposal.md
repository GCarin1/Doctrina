# Change 0061-a-depreciacao-chega-a-maquina — a depreciacao chega a maquina

- **Status:** applied
- **Applied:** 2026-09-08
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** cli

## Why

a depreciacao de um comando nao chega a quem le o envelope JSON, que e o consumidor primario da CLI

## What

A change 0049 anuncia a depreciação de um comando escrevendo no stderr real,
antes da captura — o stdout continua JSON puro, o que está certo, mas o array
`stderr` do envelope sai vazio. Quem lê só o envelope nunca fica sabendo.

- O envelope passa a carregar a depreciação num campo próprio: o comando
  substituto e a versão a partir da qual o nome antigo é legado.
- A linha em prosa no stderr continua, para quem está no terminal.
- Delta em `specs/cli`.

Depreciação existe para que consumidores migrem, e o consumidor primário desta
CLI é um agente lendo JSON.

## Scope boundaries

- Não muda quais comandos estão depreciados nem a régua do ADR 0026.
- Não altera o stdout de nenhum comando: o campo entra no envelope, não na saída
  capturada.

## Verification


- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] `<comando depreciado> --json` traz o substituto num campo do envelope.
- [x] O stdout continua JSON válido e idêntico ao de antes.
- [x] Um comando não depreciado não ganha o campo.

## Open questions

- Nenhuma.
