# Tasks — Change 0042-a-lane-fica-registrada-na-proposta

- [x] Adicionar o campo `Lane` ao template de proposta, tolerado por `analyze` e `validate`.
- [x] Gravar a lane, a confiança e os sinais no `work`, inclusive quando houve `--force` ou `--chore`.
- [x] Ler o campo em `scan.js` e registrá-lo no índice, para changes abertas e arquivadas.
- [x] Agregar o mix por lane no `report`, contando as sem registro como unknown.
- [x] Testes: gravação, desacordo, leitura no índice, ausência do campo, e independência dos gates.
- [x] Atualizar `docs/en/workflow.md` e `docs/pt/workflow.md`.
- [x] Escrever o corpo EARS do delta `specs/cli/delta.md`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-07-0042-a-lane-fica-registrada-na-proposta/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
