# Tasks — Change 0237-a-sexta-auditoria-confere-o-cursor-e-o-contrato

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0237-a-sexta-auditoria-confere-o-cursor-e-o-contrato` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] Fazer os hooks no formato Claude responderem nos termos do Cursor
  - Files: packages/doctrina-cli/src/commands/prime.js, packages/doctrina-cli/src/lib/workspace-guard.js
- [x] Levar ao cartão toda decisão global e o que ela decide
  - Files: packages/doctrina-cli/src/lib/task-card.js, packages/doctrina-cli/src/commands/change.js
- [x] Testes reproduzidos no código antigo; docs EN e PT e CHANGELOG
  - Verify: node --test packages/doctrina-cli/test/a-sexta-auditoria-confere-o-cursor.test.js
