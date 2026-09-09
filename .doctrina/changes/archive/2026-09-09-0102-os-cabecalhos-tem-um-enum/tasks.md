# Tasks — Change 0102-os-cabecalhos-tem-um-enum

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] Declarar o domínio de `Status`, `Implementation` e da marca de critério em `lib/spec-ops.js`, com a palavra de estado separada da nota.
- [x] Fazer `set-header`, `set-criterion` e `append-criterion` recusarem um valor fora do domínio (spec intocada) — cobre `spec set` e o bloco `ops` dos deltas.
- [x] Fazer `validate` reportar como `error` um valor escrito à mão fora do domínio.
- [x] Teste: o domínio, as três portas, e a nota depois da palavra.
- [x] Documentar o domínio em `docs/en/cli-reference.md` e `docs/pt/cli-reference.md` (seção `spec set`).
- [x] Escrever o corpo EARS dos deltas `specs/authoring` e `specs/gates`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-09-0102-os-cabecalhos-tem-um-enum/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
