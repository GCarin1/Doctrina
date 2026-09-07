# Tasks — Change 0033-o-gate-de-runtime-entra-no-close-e-no-ci

<!-- Planejado, não iniciado. Retome com `doctrina work --resume 0033-o-gate-de-runtime-entra-no-close-e-no-ci`. -->

- [ ] Adicionar o passo `runtime` à sequência de `close.js`, entre `apply` e `coverage`.
- [ ] Definir o nível por severidade: `error` bloqueia, `warn` reporta e segue.
- [ ] Adicionar o passo de contrato ao `action.yml`, alinhado com os gates existentes.
- [ ] Fixture de teste: contrato com wiring quebrado recusado pelo close; projeto sem contrato inalterado.
- [ ] Atualizar `docs/en/gating.md`, `docs/en/ci.md` e os espelhos em `docs/pt/`.
- [ ] Escrever o corpo EARS do delta `specs/gates/delta.md`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-07-0033-o-gate-de-runtime-entra-no-close-e-no-ci/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
