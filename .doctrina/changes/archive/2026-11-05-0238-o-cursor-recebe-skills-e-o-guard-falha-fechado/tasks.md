# Tasks — Change 0238-o-cursor-recebe-skills-e-o-guard-falha-fechado

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0238-o-cursor-recebe-skills-e-o-guard-falha-fechado` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] Trocar os comandos do Cursor por skills com o frontmatter que o Cursor exige
  - Files: .doctrina/templates/adapters/cursor/.cursor/skills/
- [x] Migrar instalações antigas, inclusive repositórios sombra
  - Files: packages/doctrina-cli/src/lib/adapters.js, packages/doctrina-cli/src/lib/workspace.js, packages/doctrina-cli/src/commands/adapter.js, packages/doctrina-cli/src/commands/upgrade.js
- [x] Fazer o guard falhar fechado quando há ferramenta declarada
  - Files: packages/doctrina-cli/src/lib/workspace-agents.js
- [x] Testes reproduzidos no código antigo; docs EN e PT, spec, CHANGELOG
  - Verify: node --test packages/doctrina-cli/test/o-cursor-recebe-skills-e-o-guard-falha-fechado.test.js
