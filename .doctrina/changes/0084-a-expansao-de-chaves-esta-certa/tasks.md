# Tasks — Change 0084-a-expansao-de-chaves-esta-certa

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [ ] Compilar sempre a partir da expansão, nunca do glob original.
- [ ] Casar o par de chaves correspondente, contando profundidade, em vez do primeiro fechamento.
- [ ] Decidir e implementar o que fazer com uma chave sem par: nunca uma correspondência parcial calada.
- [ ] Teste de mesa dos casos: um elemento, aninhado, sem par, vazio, e os que já funcionavam.
- [ ] Escrever o corpo EARS do delta `specs/gates`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-08-0084-a-expansao-de-chaves-esta-certa/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
