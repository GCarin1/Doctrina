# Tasks — Change 0099-o-envelope-json-diz-a-verdade

- [x] `command` passa a nomear a operação, via o catálogo, e `args` carrega o resto.
- [x] Recusa de flag desconhecida emite envelope quando `--json` foi pedido.
- [x] Testes: argumento em args, sub-operação inteira, recusa em JSON, acordo ok/exit_code.
- [x] Ajustar o teste que fixava a forma antiga (`contract new system`).
- [x] Escrever o corpo EARS do delta `specs/cli/delta.md`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
