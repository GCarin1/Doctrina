# Tasks — Change 0073-o-adapter-remove-nao-deixa-rastro

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

<!-- Planejado, nao iniciado. Retome com `doctrina work --resume 0073-o-adapter-remove-nao-deixa-rastro`. -->

- [ ] Remover, no `adapter remove`, os diretórios que o adapter criou e que ficaram vazios.
- [ ] Garantir que um diretório com conteúdo alheio nunca é removido.
- [ ] Teste: `add` + `remove` devolvendo a árvore ao estado original, e o caso do diretório com conteúdo do usuário.
- [ ] Escrever o corpo EARS do delta `specs/scaffolding`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-08-0073-o-adapter-remove-nao-deixa-rastro/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
