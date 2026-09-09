# Tasks — Change 0063-o-gate-de-docs-le-o-contrato

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

<!-- Planejado, nao iniciado. Retome com `doctrina work --resume 0063-o-gate-de-docs-le-o-contrato`. -->

- [x] Ler o contrato do projeto checado e extrair dele o vocabulário de superfície: portas, variáveis de ambiente, interfaces, nomes de comando.
- [x] Fazer `documentedSurfaceSignals` casar contra esse vocabulário, mantendo o catálogo do Doctrina como último recurso para quem não tem contrato.
- [x] Filtrar `documentationHomes` para diretórios que contêm Markdown.
- [x] Testes: as cinco changes de formato adotante do achado, um projeto sem contrato, e a dica sem `docs/assets/`.
- [x] Escrever o corpo EARS do delta `specs/gates`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-08-0063-o-gate-de-docs-le-o-contrato/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
