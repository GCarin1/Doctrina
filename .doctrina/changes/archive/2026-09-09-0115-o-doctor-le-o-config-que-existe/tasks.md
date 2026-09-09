# Tasks — Change 0115-o-doctor-le-o-config-que-existe

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] A linha `config` do `doctor` é `fail` quando `loadConfig` reporta erros, nomeando-os.
- [x] `loadConfig` devolve as chaves desconhecidas; `validate` e `doctor` avisam com a lista das chaves válidas.
- [x] Teste: config inválido → linha `fail`; chave com typo → warning nos dois; config válido → silêncio.
- [x] Documentar em `docs/en/cli-reference.md` e `docs/pt/cli-reference.md` (seção `doctor` e lista do `validate`).
- [x] Escrever o corpo EARS do delta `specs/gates`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-09-0115-o-doctor-le-o-config-que-existe/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
