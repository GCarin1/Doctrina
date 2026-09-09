# Tasks — Change 0116-o-carimbo-nao-regride

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] O hook `pre-commit` invoca o CLI que o instalou (caminho absoluto), com `DOCTRINA=` como override; o template canônico ganha o placeholder.
- [x] `save` do índice nunca escreve um carimbo menor do que o existente; `validate` distingue carimbo atrás (rebuild) de à frente (upgrade the CLI); `index rebuild --check` não conta um carimbo à frente como drift.
- [x] Teste: o hook instalado; o carimbo à frente sobrevive a `validate --fix` e a `index rebuild`; `--check` sai 0 sobre ele.
- [x] Documentar em `docs/en/cli-reference.md` e `docs/pt/cli-reference.md` (seção `hooks install` e lista do `validate`).
- [x] Escrever o corpo EARS dos deltas `specs/scaffolding` e `specs/gates`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-09-0116-o-carimbo-nao-regride/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
