# Tasks — Change 0104-os-ordinais-do-tick-sao-estaveis

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] Numerar todas as caixas em ordem de leitura no `change tick`, marcadas ou não; listar o estado; no-op nomeado numa caixa já marcada.
- [x] Recusar um ordinal que não é número pelo nome do argumento, sem `NaN`.
- [x] Aceitar `-`, `*` e `+` como bullet de caixa em `parseChecklist` (modelo de documento — vale para o tick e para o gate).
- [x] Teste: numeração estável, ticks sequenciais, bullet `*`, `--all`, argumento inválido.
- [x] Documentar em `docs/en/cli-reference.md` e `docs/pt/cli-reference.md` (seção `change tick`).
- [x] Escrever o corpo EARS do delta `specs/authoring`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-09-0104-os-ordinais-do-tick-sao-estaveis/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
