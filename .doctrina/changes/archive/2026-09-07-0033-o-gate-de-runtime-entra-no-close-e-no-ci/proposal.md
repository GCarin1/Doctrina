# Change 0033-o-gate-de-runtime-entra-no-close-e-no-ci — o gate de runtime entra no close e no CI

- **Status:** applied
- **Applied:** 2026-09-07
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** gates

## Why

os checks RT01 a RT05 existem em lib/runtime.js e nenhum driver padrao os executa: close nao os roda, validate so sob --runtime e a action publicada nao os roda; incluir runtime como passo do close e da action

## What

Adiciona o passo `runtime` a `src/commands/close.js` e ao `action.yml`, usando os
mesmos findings de `src/lib/runtime.js` que `contract check`, `triage` e `doctor` já
renderizam — nenhum check novo, nenhuma lógica duplicada.

- No `close`: bloqueante quando há finding `error`, consultivo quando só há `warn`.
- No `action.yml`: um passo `doctrina contract check`, junto dos demais gates.
- Delta em `specs/gates`: a sequência de fechamento e o conjunto de gates do CI.

Achado F2 da auditoria. As 724 linhas de `lib/runtime.js` (ADR 0023/0024, RT01–RT05)
não são executadas por nenhum driver padrão: `close` não as roda, `validate` só sob
`--runtime`, e a action publicada não as roda. `next` já promove esses findings ao topo
da fila — a prioridade está declarada, só a execução falta.

## Scope boundaries

- Não altera os checks RT01–RT05 nem a gramática das tabelas do contrato.
- Não torna `validate --runtime` o padrão: ele lê fora de `.doctrina/` e o validate estrutural deve seguir barato.
- Não toca `triage`, que continua sendo a porta de diagnóstico.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Uma change cujo contrato declara wiring que não vale é recusada por `doctrina close`.
- [x] O mesmo caso faz o job de gates do `action.yml` sair diferente de zero.
- [x] Um projeto sem contratos, ou com contratos sem linhas declaradas, fecha normalmente.

## Open questions

- Nenhuma.
