# Tasks — Change 0114-os-retardatarios-do-contrato-de-saida

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] `close` verifica a existência da change antes de sequenciar e sai com a classe de uso.
- [x] O envelope `--json` captura `process.stderr.write` e remove `\r` das linhas capturadas.
- [x] Teste: `close 0099` sai 2; `verify --json` com stderr do filho devolve stdout puro e o envelope completo; `tick abc` nomeia o argumento.
- [x] Documentar em `docs/en/cli-reference.md` e `docs/pt/cli-reference.md` (seções `close` e `verify`).
- [x] Escrever o corpo EARS do delta `specs/cli`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-09-0114-os-retardatarios-do-contrato-de-saida/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
