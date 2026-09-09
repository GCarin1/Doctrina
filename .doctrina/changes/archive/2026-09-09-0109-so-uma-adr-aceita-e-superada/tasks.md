# Tasks — Change 0109-so-uma-adr-aceita-e-superada

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] `decision supersede` exige alvo `accepted`; uma proposta é recusada com o estado atual e o remédio.
- [x] Um título composto só de dígitos é recusado, com a gramática `supersede <número> "<título>"` na dica.
- [x] Teste: proposta recusada, aceita superada, título numérico recusado.
- [x] Documentar em `docs/en/cli-reference.md` e `docs/pt/cli-reference.md` (seção `decision supersede`).
- [x] Escrever o corpo EARS do delta `specs/authoring`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-09-0109-so-uma-adr-aceita-e-superada/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
