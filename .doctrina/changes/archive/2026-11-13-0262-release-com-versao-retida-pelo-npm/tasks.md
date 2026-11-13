# Tasks — Change 0262-release-com-versao-retida-pelo-npm

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0262-release-com-versao-retida-pelo-npm` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] Release sem gatilho de tag, versão retida como aviso, trusted publishing
  - Files: .github/workflows/release.yml
- [x] Teste da release
  - Files: packages/doctrina-cli/test/o-release-carimba-tudo-e-publica-sozinho.test.js
- [x] Doc de CI EN/PT, skill cut-a-release e CHANGELOG
  - Files: docs/en/ci.md, docs/pt/ci.md, .doctrina/skills/cut-a-release.md, CHANGELOG.md
