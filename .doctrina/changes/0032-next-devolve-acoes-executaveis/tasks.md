# Tasks — Change 0032-next-devolve-acoes-executaveis

<!-- Planejado, não iniciado. Retome com `doctrina work --resume 0032-next-devolve-acoes-executaveis`. -->

- [ ] Definir o tipo `Action` e mover `computeActions` para `src/lib/actions.js`.
- [ ] Reescrever cada `actions.push(...)` de `next.js` como ação tipada, preservando a ordem de prioridade.
- [ ] Escrever o renderizador de uma ação em texto e usá-lo em `next`, `prime`, `handoff` e `watch`.
- [ ] Emitir as ações estruturadas em `next --json`, dentro do envelope versionado.
- [ ] Implementar `next --run`: executa a primeira ação bloqueante in-process; recusa as destrutivas.
- [ ] Testes: payload estruturado, texto inalterado, recusa da ação destrutiva.
- [ ] Escrever o corpo EARS do delta `specs/cli/delta.md` e documentar em `docs/en/` e `docs/pt/`.

## Closing steps

- [ ] Apply the change: merge each delta into the corresponding spec.
- [ ] Archive the change folder to `.doctrina/changes/archive/2026-09-07-0032-next-devolve-acoes-executaveis/`.
- [ ] Update `.doctrina/index.json` with new or modified artifacts.
