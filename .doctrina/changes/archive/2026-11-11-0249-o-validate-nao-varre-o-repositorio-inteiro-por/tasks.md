# Tasks — Change 0249-o-validate-nao-varre-o-repositorio-inteiro-por

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0249-o-validate-nao-varre-o-repositorio-inteiro-por` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] Limitar a varredura dos padrões Source e corrigir o prefixo
  - Files: packages/doctrina-cli/src/lib/runtime.js, packages/doctrina-cli/src/lib/fs-ops.js
- [x] Ler cada arquivo de evidência uma vez
  - Files: packages/doctrina-cli/src/lib/coverage-model.js
- [x] Teste e CHANGELOG
  - Files: packages/doctrina-cli/test/o-validate-nao-varre-o-repositorio-inteiro.test.js, CHANGELOG.md
