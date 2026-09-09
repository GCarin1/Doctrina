# Tasks — Change 0117-a-suite-roda-em-windows

- [x] Diagnosticar as 18 falhas e separar CRLF/caminho do que é estado da árvore.
- [x] Corrigir a construção do repo root em `check-docs.test.js`.
- [x] Normalizar terminadores nas comparações byte-identical (playbooks, action.yml).
- [x] Corrigir os fixtures que casavam `
` literal e viravam no-op silencioso.
- [x] Corrigir os `split("
")` que deixavam `` no fim da linha.
- [x] Escrever o corpo EARS do delta `specs/validation/delta.md`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
