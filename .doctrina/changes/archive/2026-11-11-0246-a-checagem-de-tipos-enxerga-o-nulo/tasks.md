# Tasks — Change 0246-a-checagem-de-tipos-enxerga-o-nulo

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0246-a-checagem-de-tipos-enxerga-o-nulo` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] Ligar strictNullChecks e corrigir os 82 apontamentos
  - Files: tsconfig.json, packages/doctrina-cli/src/lib/scan.js, packages/doctrina-cli/src/lib/coverage-model.js, packages/doctrina-cli/src/lib/args.js
- [x] Exigir a opção no teste e registrar no CHANGELOG
  - Files: packages/doctrina-cli/test/typecheck.test.js, CHANGELOG.md
