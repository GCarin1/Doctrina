# Tasks — Change 0236-a-quinta-auditoria-mede-a-escala-e-o-uso-real

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0236-a-quinta-auditoria-mede-a-escala-e-o-uso-real` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] Carregar só o comando invocado e dar ao guard uma porta de seis módulos
  - Files: packages/doctrina-cli/src/index.js, packages/doctrina-cli/src/lib/workspace-guard.js, packages/doctrina-cli/src/lib/workspace-locate.js, packages/doctrina-cli/src/lib/workspace.js
- [x] Limitar o next na raiz às dez primeiras ações
  - Files: packages/doctrina-cli/src/commands/next.js
- [x] Tratar o delta de uma change aberta como a atualização da spec no review sem --change
  - Files: packages/doctrina-cli/src/commands/review.js
- [x] Curar o índice nos gates do absorb
  - Files: .doctrina/templates/playbooks/absorb.md.template
- [x] Testes reproduzidos no código antigo; docs EN e PT e CHANGELOG
  - Verify: node --test packages/doctrina-cli/test/a-quinta-auditoria-mede-a-escala.test.js
