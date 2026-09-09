# Tasks — Change 0033-o-gate-de-runtime-entra-no-close-e-no-ci

- [x] Adicionar o passo `runtime` à sequência de `close.js`, entre `apply` e `coverage`.
- [x] Definir o nível por severidade: `error` bloqueia, `warn` reporta e segue.
- [x] Adicionar o passo de contrato ao `action.yml`, alinhado com os gates existentes.
- [x] Manter a paridade declarada entre `action.yml` e `.doctrina/verify.json`, e atualizar o contrato que descreve a action.
- [x] Fixture de teste: contrato com wiring quebrado recusado pelo close; projeto sem contrato inalterado.
- [x] Atualizar `docs/en/gating.md`, `docs/en/ci.md` e os espelhos em `docs/pt/`.
- [x] Escrever o corpo EARS do delta `specs/gates/delta.md`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-07-0033-o-gate-de-runtime-entra-no-close-e-no-ci/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
