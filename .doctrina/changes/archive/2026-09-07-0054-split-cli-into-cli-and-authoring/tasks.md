# Tasks — Change 0054-split-cli-into-cli-and-authoring

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] Achar a costura: agrupar os requisitos de `cli` por sujeito e separar os comandos que autoram artefatos das convenções da superfície.
- [x] Escrever o delta ADDED de `authoring` com o corpo completo, movendo os blocos VERBATIM.
- [x] Retirar o cluster movido da spec `cli`, renumerar os critérios sobreviventes e ajustar Purpose / Out of scope dos dois lados.
- [x] Confirmar que nada se perdeu: contar requisitos e critérios antes e depois.
- [x] Atualizar o que conta specs (`README.md`, `README.pt.md`) e o `index.json`.
- [x] Rodar os gates: `validate` sem aviso de cap, `trace` com os anchors intactos, `coverage --strict` verde nas duas specs.
- [x] Confirmar que o pack de `cli` cabe com folga, que nenhum ADR é omitido, e que os testes de context-retrieval voltam ao verde.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-07-0054-split-cli-into-cli-and-authoring/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
