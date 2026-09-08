# Tasks — Change 0090-um-filtro-que-nao-casa-nada-nao-aprova

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [ ] Reproduzir no repositório real: `--only` inexistente sai 0 sob `--strict` com mensagem falsa.
- [ ] Recusar um filtro que não casa capability nenhuma, nomeando o valor e as capabilities conhecidas.
- [ ] Separar «a árvore não tem critérios» de «o filtro não casou nada», que hoje compartilham uma frase.
- [ ] Teste: filtro inexistente, filtro existente, e uma árvore genuinamente sem critérios.
- [ ] Escrever o corpo EARS do delta `specs/gates`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-08-0090-um-filtro-que-nao-casa-nada-nao-aprova/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
