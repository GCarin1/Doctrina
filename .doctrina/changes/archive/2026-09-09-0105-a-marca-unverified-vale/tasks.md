# Tasks — Change 0105-a-marca-unverified-vale

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] Carregar a marca do autor na linha do critério e fazer a derivação parar em `implemented` enquanto um critério coberto estiver `[unverified]`.
- [x] Fazer `validate` dizer quantos critérios cobertos ainda estão `[unverified]` na proposta de estado.
- [x] Fazer `coverage` listar cada critério coberto ainda `[unverified]` com o op que vira a marca.
- [x] Teste: a derivação, e `validate`, `spec set --implementation auto` e `coverage` lendo a marca antes e depois de virá-la.
- [x] Documentar em `docs/en/cli-reference.md` e `docs/pt/cli-reference.md` (seção `coverage`).
- [x] Escrever o corpo EARS do delta `specs/gates`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-09-0105-a-marca-unverified-vale/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
