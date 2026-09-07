# Tasks — Change 0037-um-coletor-varias-vistas

<!-- Planejado, não iniciado. Retome com `doctrina work --resume 0037-um-coletor-varias-vistas`. -->

- [ ] Extrair `collectSnapshot()` para `src/lib/snapshot.js`, unindo `collectStatus`, `openChanges` e as contagens.
- [ ] Reescrever os quatro renderizadores como funções puras sobre o snapshot.
- [ ] Implementar `status --view` e registrar os aliases com aviso de depreciação.
- [ ] Remover os imports entre módulos de comando; adicionar teste que proíbe o padrão.
- [ ] Regenerar o bloco de superfície do AGENTS.md e atualizar o catálogo.
- [ ] Atualizar `docs/en/workflow.md`, `docs/en/flow.md` e os espelhos em `docs/pt/`.
- [ ] Escrever o corpo EARS do delta `specs/gates/delta.md`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-07-0037-um-coletor-varias-vistas/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
