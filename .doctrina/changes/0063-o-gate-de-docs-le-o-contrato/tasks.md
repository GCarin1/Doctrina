# Tasks — Change 0063-o-gate-de-docs-le-o-contrato

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

<!-- Planejado, nao iniciado. Retome com `doctrina work --resume 0063-o-gate-de-docs-le-o-contrato`. -->

- [ ] Ler o contrato do projeto checado e extrair dele o vocabulário de superfície: portas, variáveis de ambiente, interfaces, nomes de comando.
- [ ] Fazer `documentedSurfaceSignals` casar contra esse vocabulário, mantendo o catálogo do Doctrina como último recurso para quem não tem contrato.
- [ ] Filtrar `documentationHomes` para diretórios que contêm Markdown.
- [ ] Testes: as cinco changes de formato adotante do achado, um projeto sem contrato, e a dica sem `docs/assets/`.
- [ ] Escrever o corpo EARS do delta `specs/gates`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-08-0063-o-gate-de-docs-le-o-contrato/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
