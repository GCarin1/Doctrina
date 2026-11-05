# Tasks — Change 0240-release-0-21-0

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0240-release-0-21-0` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] Carimbar 0.21.0 em todo lugar que cita a versão e mover o CHANGELOG
  - Files: packages/doctrina-cli/package.json, package-lock.json, CHANGELOG.md, README.md, README.pt.md, packages/doctrina-cli/README.md, AGENTS.md
- [x] Escrever o changelog para agentes da 0.21.0
  - Files: packages/doctrina-cli/src/lib/commands.js
- [x] Recusar no primeiro passo do release uma tag que não pode ser publicada
  - Files: .github/workflows/release.yml
  - Verify: rodar o passo com GITHUB_REF_NAME=v0.21.0, v0.20.0 e com o package.json em 0.20.0
