# Tasks — Change 0053-split-gates-into-gates-and-insight

- [x] Achar a costura: agrupar os requisitos por tema e separar o cluster de leitura (context, status, prime, handoff, report, why, constitution, search, show) do cluster de gates.
- [x] Escrever o delta ADDED de `insight` com o corpo completo, movendo os blocos VERBATIM.
- [x] Retirar o cluster movido da spec `gates`, renumerar os critérios sobreviventes e ajustar Purpose / Out of scope dos dois lados.
- [x] Aplicar, e confirmar que nenhum requisito foi reescrito ou perdido na travessia.
- [x] Atualizar o que conta specs (`README.md`, `README.pt.md`) e o `index.json`.
- [x] Rodar os gates: `validate` sem o aviso de cap, `trace` com os anchors intactos, `coverage --strict` verde nas duas specs.
- [x] Confirmar que o pack de `gates` voltou a caber com folga e que nenhum ADR é omitido.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-07-0053-split-gates-into-gates-and-insight/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
