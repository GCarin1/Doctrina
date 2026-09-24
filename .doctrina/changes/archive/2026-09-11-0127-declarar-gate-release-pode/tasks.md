# Tasks — Change 0127-declarar-gate-release-pode

- [x] Fazer o job de release rodar `doctrina verify` em vez de um subconjunto à mão.
- [x] Rodar o harness de instalação empacotada antes de publicar.
- [x] Validar os exemplos em modo estrito no release.
- [x] Publicar com `--provenance`, que é o que a permissão `id-token: write` compra.
- [x] Escrever o teste que lê os dois workflows e afirma a correspondência de gates.
- [x] Provar que o teste reprova quando o gate encolhe.
- [x] Escrever o delta da spec `gates` com o requisito e o critério.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-11-0127-declarar-gate-release-pode/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
