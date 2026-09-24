# Tasks — Change 0126-validate-ganha-modo-estrito

- [x] Declarar a flag `--strict` e separar o veredito da contagem de erros.
- [x] Dizer por que a saída é 1 quando não houve erro nenhum.
- [x] Levar `strict` para o payload `--json`.
- [x] Atualizar o help do comando e as duas referências de CLI, EN e PT.
- [x] Cobrir com teste os três casos: warning sob estrito, árvore limpa sob estrito, e o payload JSON.
- [x] Passar `--strict` no passo dos exemplos do `ci.yml`.
- [x] Escrever o delta da spec `gates` com o requisito e o critério.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-11-0126-validate-ganha-modo-estrito/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
