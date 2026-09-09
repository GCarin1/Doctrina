# Tasks — Change 0113-uma-spec-fora-do-caminho-e-apontada

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] `validate` avisa: `.md` solto em `.doctrina/specs/`; pasta de capability sem `spec.md`; `.md` extra numa pasta de capability cujo título começa por `# Spec`.
- [x] Teste: os três casos avisam com o caminho canônico; `notes.md` ao lado de `spec.md` não avisa.
- [x] Documentar em `docs/en/cli-reference.md` e `docs/pt/cli-reference.md` (lista do `validate`).
- [x] Escrever o corpo EARS do delta `specs/gates`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-09-0113-uma-spec-fora-do-caminho-e-apontada/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
