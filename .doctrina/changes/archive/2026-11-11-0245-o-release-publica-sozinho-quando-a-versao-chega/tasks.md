# Tasks — Change 0245-o-release-publica-sozinho-quando-a-versao-chega

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0245-o-release-publica-sozinho-quando-a-versao-chega` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] Script de carimbos com modo de checagem
  - Files: scripts/release.mjs, SECURITY.md
- [x] Workflow que publica e marca a versão que chegou à main
  - Files: .github/workflows/release.yml
- [x] Teste dos carimbos e do workflow
  - Files: packages/doctrina-cli/test/o-release-carimba-tudo-e-publica-sozinho.test.js
- [x] Higiene: fim de linha, arquivo perdido, Dependabot, skills
  - Files: .gitattributes, .github/dependabot.yml, .doctrina/skills/check-the-line-ending-before-patching.md, .doctrina/skills/cut-a-release.md, CHANGELOG.md
