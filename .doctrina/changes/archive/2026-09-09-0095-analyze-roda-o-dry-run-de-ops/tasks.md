# Tasks — Change 0095-analyze-roda-o-dry-run-de-ops

- [x] Mover o dry-run de ops para `collectAnalysis`, com escopo `pre-apply`.
- [x] Verificar que a recusa propaga para `apply` e `close` pelo gate `structure`.
- [x] Testes: recusa, propagação, ops válidos, delta sem ops, e archive pós-apply.
- [x] Ajustar o teste do `integration.test.js` que fixava a redação antiga do apply.
- [x] Escrever o corpo EARS do delta `specs/gates/delta.md`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
