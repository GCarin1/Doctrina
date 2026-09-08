# Tasks — Change 0076-a-lane-entra-no-indice-com-a-change

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [ ] Reproduzir num projeto limpo: `init` → `work` → `validate` erra.
- [ ] Derivar a entrada da change do artefato em disco, pelo mesmo código que o `index rebuild` usa.
- [ ] Reordenar o `work` para indexar depois de a proposta estar completa (lane e Affects specs carimbados).
- [ ] Teste: `work` + `validate` sai 0 num projeto recém-inicializado; `change new` continua limpo.
- [ ] Escrever o corpo EARS do delta `specs/authoring`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-08-0076-a-lane-entra-no-indice-com-a-change/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
