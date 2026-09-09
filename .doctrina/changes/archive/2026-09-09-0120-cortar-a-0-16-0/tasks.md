# Tasks — Change 0120-cortar-a-0-16-0

- [x] Acrescentar as dez entradas desta ronda ao Unreleased do CHANGELOG.
- [x] Datar a secção como `## [0.16.0] — 2026-09-09` e deixar um Unreleased vazio.
- [x] Carimbar 0.16.0 no package.json e nos quatro arquivos que citam a versão.
- [x] Escrever os cinco bullets do changelog voltado ao agente.
- [x] Correr `upgrade --write` e `index rebuild` para regenerar os blocos e o carimbo.
- [x] Conferir o tarball com `npm pack --dry-run`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
