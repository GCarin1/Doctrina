# Tasks — Change 0250-a-setima-auditoria-fecha-fim-de-linha-conflito-e

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0250-a-setima-auditoria-fecha-fim-de-linha-conflito-e` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] Fim de linha na porta de leitura e escrita
  - Files: packages/doctrina-cli/src/lib/fs-ops.js, packages/doctrina-cli/src/lib/ledger.js
- [x] Marcadores de conflito no validate e no next
  - Files: packages/doctrina-cli/src/lib/conflict-markers.js, packages/doctrina-cli/src/lib/validation-model.js, packages/doctrina-cli/src/lib/actions.js
- [x] Trava de numeração e índice atômico
  - Files: packages/doctrina-cli/src/lib/lock.js, packages/doctrina-cli/src/commands/work.js, packages/doctrina-cli/src/lib/index-json.js
- [x] hooks install em worktree e subpasta
  - Files: packages/doctrina-cli/src/commands/hooks.js, packages/doctrina-cli/src/lib/git.js, packages/doctrina-cli/src/lib/scan.js
- [x] Bordas: --only, renumber, release, Python
  - Files: packages/doctrina-cli/src/commands/workspace.js, packages/doctrina-cli/src/lib/change-numbers.js, .github/workflows/release.yml, packages/doctrina-cli/src/lib/code-inventory.js
- [x] Testes, docs EN/PT, skills e CHANGELOG
  - Files: packages/doctrina-cli/test/a-setima-auditoria-fecha-fim-de-linha-conflito-e-concorrencia.test.js, docs/en/cli-reference.md, docs/pt/cli-reference.md, CHANGELOG.md
