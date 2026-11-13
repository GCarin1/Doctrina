# Tasks — Change 0261-release-0-22-0

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0261-release-0-22-0` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] Changelog para humanos (Upgrading from 0.21) e para agentes (cinco linhas)
  - Files: CHANGELOG.md, packages/doctrina-cli/src/lib/commands.js
- [x] Carimbar 0.22.0 com scripts/release.mjs
  - Files: packages/doctrina-cli/package.json, package-lock.json, AGENTS.md, README.md, README.pt.md, packages/doctrina-cli/README.md, SECURITY.md, .doctrina/index.json, examples/python-fastapi-urls/.doctrina/index.json, examples/typescript-express-retrofit/.doctrina/index.json
- [x] Conferir o tarball com npm pack --dry-run
  - Files: packages/doctrina-cli/package.json
