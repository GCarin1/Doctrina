# Tasks — Change 0032-next-devolve-acoes-executaveis

<!-- Planejado, não iniciado. Retome com `doctrina work --resume 0032-next-devolve-acoes-executaveis`. -->

- [x] Definir o tipo `Action` e mover `computeActions` para `src/lib/actions.js`.
- [x] Reescrever cada `actions.push(...)` de `next.js` como ação tipada, preservando a ordem de prioridade.
- [x] Escrever o renderizador de uma ação em texto e usá-lo em `next`, `prime`, `handoff` e `watch`.
- [x] Emitir as ações estruturadas em `next --json`, dentro do envelope versionado.
- [x] Implementar `next --run`: executa a primeira ação runnable in-process; recusa as que exigem uma pessoa.
- [x] Testes: payload estruturado, texto inalterado, recusa da ação que exige autoria humana.
- [x] Escrever o corpo EARS do delta `specs/cli/delta.md` e documentar em `docs/en/` e `docs/pt/`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-07-0032-next-devolve-acoes-executaveis/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
