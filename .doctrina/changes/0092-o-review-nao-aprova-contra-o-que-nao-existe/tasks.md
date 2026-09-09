# Tasks — Change 0092-o-review-nao-aprova-contra-o-que-nao-existe

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [ ] Reproduzir: a mesma árvore contra um ref válido e contra um inexistente.
- [ ] Distinguir «o ref não resolve» de «resolveu e não há diferença», que hoje compartilham uma resposta.
- [ ] Conferir que o caso fora de repositório continua se calando, e que o `--diff` válido não muda.
- [ ] Teste: ref inexistente, ref válido com quebras, ref válido sem diferença, e fora de repositório.
- [ ] Escrever o corpo EARS do delta `specs/gates`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-09-0092-o-review-nao-aprova-contra-o-que-nao-existe/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
