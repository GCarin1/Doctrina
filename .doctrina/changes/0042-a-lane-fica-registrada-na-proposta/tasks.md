# Tasks — Change 0042-a-lane-fica-registrada-na-proposta

<!-- Planejado, não iniciado. Retome com `doctrina work --resume 0042-a-lane-fica-registrada-na-proposta`. -->

- [ ] Adicionar o campo `Lane` ao template de proposta e ao `analyze`/`validate`.
- [ ] Gravar a lane, a confiança e os sinais no `work`, inclusive quando houve `--force`.
- [ ] Ler o campo em `scan.js` e registrá-lo no índice da change.
- [ ] Agregar o mix por lane no `report`.
- [ ] Testes: gravação, leitura, ausência do campo em changes antigas.
- [ ] Atualizar `docs/en/workflow.md` e `docs/pt/workflow.md`.
- [ ] Escrever o corpo EARS do delta `specs/cli/delta.md`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-07-0042-a-lane-fica-registrada-na-proposta/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
