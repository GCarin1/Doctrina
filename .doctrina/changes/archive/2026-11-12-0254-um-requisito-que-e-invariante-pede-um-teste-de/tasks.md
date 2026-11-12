# Tasks — Change 0254-um-requisito-que-e-invariante-pede-um-teste-de

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0254-um-requisito-que-e-invariante-pede-um-teste-de` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] Reconhecer a biblioteca, os requisitos e a forma de cada um
  - Files: packages/doctrina-cli/src/lib/properties.js
- [x] A marca [property] no coverage e na gramática
  - Files: packages/doctrina-cli/src/lib/coverage-model.js, packages/doctrina-cli/src/lib/spec-ops.js
- [x] coverage --properties, change delta --property e a nota do --requirement
  - Files: packages/doctrina-cli/src/commands/coverage.js, packages/doctrina-cli/src/commands/change.js, packages/doctrina-cli/src/lib/change-ops.js
- [x] Testes, docs EN/PT e CHANGELOG
  - Files: packages/doctrina-cli/test/um-requisito-que-e-invariante-pede-uma-propriedade.test.js, docs/en/cli-reference.md, docs/pt/cli-reference.md, CHANGELOG.md
