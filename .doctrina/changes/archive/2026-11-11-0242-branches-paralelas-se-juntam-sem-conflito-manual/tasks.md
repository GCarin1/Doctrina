# Tasks — Change 0242-branches-paralelas-se-juntam-sem-conflito-manual

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0242-branches-paralelas-se-juntam-sem-conflito-manual` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] Fundir o índice como dados e expor o driver
  - Files: packages/doctrina-cli/src/lib/index-merge.js, packages/doctrina-cli/src/commands/index-rebuild.js, packages/doctrina-cli/src/lib/index-json.js
- [x] Configurar o merge no hooks install
  - Files: packages/doctrina-cli/src/lib/merge-setup.js, packages/doctrina-cli/src/commands/hooks.js
- [x] Numerar além das outras branches, avisar a repetição e renumerar
  - Files: packages/doctrina-cli/src/lib/change-numbers.js, packages/doctrina-cli/src/commands/work.js, packages/doctrina-cli/src/commands/change.js, packages/doctrina-cli/src/lib/validation-model.js
- [x] Testes, catálogo, docs EN/PT e CHANGELOG
  - Files: packages/doctrina-cli/test/branches-paralelas-se-juntam.test.js, packages/doctrina-cli/src/lib/commands.js, docs/en/cli-reference.md, docs/pt/cli-reference.md, CHANGELOG.md
