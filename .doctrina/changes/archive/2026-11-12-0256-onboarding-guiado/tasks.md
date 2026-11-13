# Tasks — Change 0256-onboarding-guiado

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0256-onboarding-guiado` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] O estado, os passos e as candidatas
  - Files: packages/doctrina-cli/src/lib/onboard.js
- [x] O comando onboard e o catálogo
  - Files: packages/doctrina-cli/src/commands/onboard.js, packages/doctrina-cli/src/lib/commands.js, packages/doctrina-cli/src/index.js
- [x] Skills dos adapters e o ponteiro do init
  - Files: .doctrina/templates/adapters/claude/.claude/commands/doctrina-onboard.md.template, .doctrina/templates/adapters/cursor/.cursor/skills/doctrina-onboard/SKILL.md.template, packages/doctrina-cli/src/lib/intake-model.js
- [x] upgrade entrega o arquivo novo de um adapter instalado
  - Files: packages/doctrina-cli/src/lib/adapters.js, packages/doctrina-cli/src/commands/upgrade.js
- [x] Testes, docs EN/PT, READMEs e CHANGELOG
  - Files: packages/doctrina-cli/test/o-onboarding-conduz-o-ciclo-uma-vez.test.js, docs/en/cli-reference.md, docs/pt/cli-reference.md, docs/en/getting-started.md, docs/pt/getting-started.md, docs/en/adapters.md, docs/pt/adapters.md, CHANGELOG.md
