# Tasks — Change 0037-um-coletor-varias-vistas

- [x] Extrair `collectSnapshot()` para `src/lib/snapshot.js`, unindo `collectStatus`, `openChanges` e as contagens.
- [x] Reescrever os quatro renderizadores como funções puras sobre o snapshot (`src/lib/views.js`).
- [x] Implementar `status --view <nome>`, com recusa nomeada para uma vista inexistente.
- [x] Mover os coletores compartilhados para `src/lib/` (coverage, trace, constitution, analysis, templates, work, triage, intake, change).
- [x] Remover os imports entre módulos de comando E a aresta `lib/` → `commands/`; adicionar teste que proíbe os dois padrões.
- [x] Provar por teste que cada vista sai byte a byte igual pelo seu comando e pelo `--view`.
- [x] Atualizar `docs/en/workflow.md`, `docs/en/flow.md`, `docs/en/cli-reference.md` e os espelhos em `docs/pt/`.
- [x] Escrever o corpo EARS do delta `specs/gates/delta.md`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-07-0037-um-coletor-varias-vistas/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
