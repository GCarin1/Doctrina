# Tasks — Change 0241-o-release-recarimba-os-exemplos

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0241-o-release-recarimba-os-exemplos` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] Recarimbar o índice dos exemplos
  - Files: examples/python-fastapi-urls/.doctrina/index.json, examples/typescript-express-retrofit/.doctrina/index.json
- [x] Falhar a suíte quando um exemplo fica atrás da versão
  - Files: packages/doctrina-cli/test/os-exemplos-acompanham-a-versao.test.js
- [x] Registrar o passo no procedimento de release e no CHANGELOG
  - Files: .doctrina/skills/cut-a-release.md, CHANGELOG.md
