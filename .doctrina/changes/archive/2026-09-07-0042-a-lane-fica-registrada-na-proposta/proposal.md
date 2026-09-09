# Change 0042-a-lane-fica-registrada-na-proposta — a lane fica registrada na proposta

- **Status:** applied
- **Applied:** 2026-09-07
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** cli

## Why

work classifica a lane do pedido, decide se segura, imprime os sinais e descarta o resultado, entao nenhum relatorio consegue dizer que tipo de trabalho o time faz; gravar a lane e os sinais no cabecalho da proposta

## What

`doctrina work` passa a gravar a lane que o `triage` calculou no cabeçalho da proposta:
`- **Lane:** product (confiante; sinais: add, should)`.

- O template de proposta ganha o campo; `scan.js` o lê; o índice o registra.
- `report` agrega o mix por lane no período.
- Delta em `specs/cli`.

Achado F11 da auditoria. Hoje `classify()` roda, decide se segura o pedido, imprime os
sinais que casaram — e descarta o resultado. A proposta arquivada não registra em que
lane a change nasceu, então nenhum relatório consegue dizer que tipo de trabalho o time
faz, e o classificador não tem nenhum conjunto de acerto/erro para ser calibrado.

Sinal concreto desta sessão: das 20 changes abertas, três foram seguradas como RUNTIME
e precisaram de `--force` — "playbooks são templates", "o ledger vira fonte legível" e
"métricas e uso realimentam o fluxo". Nenhuma era diagnóstico; todas eram autoria. Sem
o registro, esse dado se perde no terminal.

## Scope boundaries

- Não muda o classificador nem os pesos dos sinais: só registra o veredito.
- Não muda o comportamento do hold nem do `--force`.
- A lane gravada é um registro histórico, não um campo que gates leem para decidir.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Uma change aberta por `work` carrega a lane e os sinais no cabeçalho da proposta.
- [x] `validate` aceita o cabeçalho novo e o índice o registra sem drift.
- [x] `report` mostra o mix por lane no período.

## Open questions

- Resolvida: SIM, e é o registro mais importante dos dois. O cabeçalho grava o
  veredito do classificador e, quando o operador foi por outro caminho, o que
  ele fez — `— opened anyway (--force)`, `— opened as chore`. Gravar só as
  concordâncias formaria um conjunto de calibração feito exatamente dos casos
  que não precisam de calibração. O sinal desta sessão é o exemplo: três das
  changes abertas foram seguradas como RUNTIME e nenhuma era diagnóstico.
