# Tasks — Change 0134-cli-pode-sair-antes

- [x] Isolar a causa a partir do log instrumentado: o concat para antes do fim.
- [x] Trocar `process.exit` por `process.exitCode` no entrypoint.
- [x] Conferir que nenhum dos vinte e cinco comandos pendura depois da troca.
- [x] Conferir que os códigos de saída 0, 1, 2 e 3 seguem intactos.
- [x] Fixar a promessa com testes que valem em toda plataforma.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-11-0134-cli-pode-sair-antes/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
