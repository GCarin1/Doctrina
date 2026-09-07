# Tasks — Change 0043-a-gramatica-on-disk-tem-um-dono

<!-- Planejado, não iniciado. Retome com `doctrina work --resume 0043-a-gramatica-on-disk-tem-um-dono`. -->

- [ ] Mover `parseFrontmatter`, `parseOperation` e `parseCapabilityFromDelta` para `lib/doc-model.js`.
- [ ] Migrar os call sites em `commands/` e em `lib/scan.js`.
- [ ] Adicionar o teste estrutural que proíbe `lib/ → commands/`.
- [ ] Confirmar que `tsc --noEmit` e a suíte seguem verdes sem mudar expectativas.
- [ ] Escrever o corpo EARS do delta `specs/validation/delta.md`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-07-0043-a-gramatica-on-disk-tem-um-dono/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
