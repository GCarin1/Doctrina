# Tasks — Change 0235-a-quarta-auditoria-fecha-as-entradas-hostis

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0235-a-quarta-auditoria-fecha-as-entradas-hostis` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] Pôr aspas em todo caminho e título dos comandos impressos
  - Files: packages/doctrina-cli/src/lib/shell.js, packages/doctrina-cli/src/lib/workspace-view.js, packages/doctrina-cli/src/commands/delivery.js, .doctrina/templates/playbooks/delivery.md.template
- [x] Fechar os desvios do guard e avisar de servidor MCP sem configuração
  - Files: packages/doctrina-cli/src/lib/workspace-tools.js, packages/doctrina-cli/src/lib/workspace-view.js, packages/doctrina-cli/src/commands/workspace.js
- [x] doctor e metrics na raiz; recriar sombra perdida; attach para repositório sem links
  - Files: packages/doctrina-cli/src/commands/doctor.js, packages/doctrina-cli/src/commands/metrics.js, packages/doctrina-cli/src/commands/workspace.js, packages/doctrina-cli/src/lib/workspace.js
- [x] Testes reproduzidos no código antigo; docs EN e PT e CHANGELOG
  - Verify: node --test packages/doctrina-cli/test/a-quarta-auditoria-fecha-as-entradas-hostis.test.js
