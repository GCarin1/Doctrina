# Tasks — Change 0068-o-contract-check-responde-a-maquina

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

<!-- Planejado, nao iniciado. Retome com `doctrina work --resume 0068-o-contract-check-responde-a-maquina`. -->

- [ ] Tornar o `contract check` `jsonNative`, com `contracts`, `declared_rows`, `unchecked` e `findings` no payload.
- [ ] Corrigir a concordância do resumo humano.
- [ ] Conferir que o `exit_code` não mudou em nenhum dos casos que a change 0029 fixou.
- [ ] Teste: contrato sem wiring, contrato com wiring que se sustenta, e um com finding, lidos pelo payload.
- [ ] Escrever o corpo EARS do delta `specs/gates`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-08-0068-o-contract-check-responde-a-maquina/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
