# Tasks — Change 0067-uma-contagem-de-caixas

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

<!-- Planejado, nao iniciado. Retome com `doctrina work --resume 0067-uma-contagem-de-caixas`. -->

- [ ] Levar a contagem de caixas para o document model, distinguindo caixa escrita de placeholder vazio.
- [ ] Repontar o `snapshot.js`, o `gates.js` e o `change tick` para ela.
- [ ] Conferir o que cada superfície passa a imprimir e ajustar o texto onde a mudança de número mudar o sentido.
- [ ] Teste: uma change com placeholders e closing steps, lida pelas três superfícies, com o mesmo número.
- [ ] Escrever o corpo EARS do delta `specs/validation`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-08-0067-uma-contagem-de-caixas/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
