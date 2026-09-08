# Tasks — Change 0088-citar-um-comando-nao-e-mexer-nele

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [ ] Reproduzir com a proposta da change 0085 e isolar de onde vem cada sinal.
- [ ] Distinguir a citação que descreve o sintoma da que declara a alteração, sem voltar a ler o diff.
- [ ] Conferir contra changes reais do arquivo: as que alteraram superfície continuam sendo pegas.
- [ ] Teste: proposta que só cita passa, proposta que altera é pega, e o caso da 0085 fecha limpo.
- [ ] Escrever o corpo EARS do delta `specs/gates`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-08-0088-citar-um-comando-nao-e-mexer-nele/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
