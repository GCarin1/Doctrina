# Tasks — Change 0083-o-trace-nao-aprova-o-vazio

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [ ] Reproduzir: zero âncoras dá ok e exit 0, inclusive sob --strict.
- [ ] Fazer o vazio ser reportado como o que é, com a ação que o resolve, sem quebrar o bootstrap.
- [ ] Alinhar `trace` e `doctor` na mesma leitura do estado vazio.
- [ ] Teste: árvore vazia, árvore com âncora não realizada, árvore com âncora realizada.
- [ ] Escrever o corpo EARS do delta `specs/gates`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-08-0083-o-trace-nao-aprova-o-vazio/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
