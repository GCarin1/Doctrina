# Tasks — Change 0043-a-gramatica-on-disk-tem-um-dono

- [x] Mover `parseFrontmatter`, `parseOperation`, `parseCapabilityFromDelta` e `isUntouchedScaffold` para `lib/doc-model.js`.
- [x] Migrar os call sites em `commands/` e em `lib/`, e remover os módulos intermediários.
- [x] Estender o teste estrutural: além de proibir `lib/ → commands/`, fixar o dono da gramática e proibir uma segunda definição.
- [x] Confirmar que `tsc --noEmit` e a suíte seguem verdes sem mudar expectativas.
- [x] Escrever o corpo EARS do delta `specs/validation/delta.md`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-07-0043-a-gramatica-on-disk-tem-um-dono/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
