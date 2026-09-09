# Tasks — Change 0111-um-scaffold-nao-e-um-artefato

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] `validate` avisa num contrato cujas linhas de Wiring/Selectors ou References ainda são as do scaffold.
- [x] `validate` avisa numa skill cuja `description:` ou `when:` ainda está em forma `<…>`; um `when:` assim não é trigger detectável.
- [x] `skill sync` diz que a skill ainda é scaffold em vez de «up to date».
- [x] Teste: contrato e skill recém-criados avisam; preenchidos, silêncio.
- [x] Documentar em `docs/en/cli-reference.md` e `docs/pt/cli-reference.md` (lista do `validate` e seção `skill sync`).
- [x] Escrever o corpo EARS dos deltas `specs/gates` e `specs/skills`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-09-0111-um-scaffold-nao-e-um-artefato/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
