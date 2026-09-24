# Tasks — Change 0189-cortar

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] Datar o CHANGELOG como 0.17.0, uma seção por tipo, com a nota de migração.
- [x] Carimbar 0.17.0 no package.json, lockfile e READMEs.
- [x] Escrever os bullets do changelog voltado ao agente.
- [x] Rodar `upgrade --write` na raiz e `index rebuild` nos exemplos.
- [x] Conferir o tarball com `npm pack --dry-run`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-24-0189-cortar/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
