# Tasks — Change 0090-um-filtro-que-nao-casa-nada-nao-aprova

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] Reproduzir no repositório real: `--only` inexistente sai 0 sob `--strict` com mensagem falsa.
- [x] Recusar um filtro que não casa capability nenhuma, nomeando o valor e as capabilities conhecidas.
- [x] Separar «a árvore não tem critérios» de «o filtro não casou nada», que hoje compartilham uma frase.
- [x] Teste: filtro inexistente, filtro existente, e uma árvore genuinamente sem critérios.
- [x] Escrever o corpo EARS do delta `specs/gates`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-08-0090-um-filtro-que-nao-casa-nada-nao-aprova/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
