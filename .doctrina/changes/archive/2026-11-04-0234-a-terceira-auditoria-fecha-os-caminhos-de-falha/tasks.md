# Tasks — Change 0234-a-terceira-auditoria-fecha-os-caminhos-de-falha

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0234-a-terceira-auditoria-fecha-os-caminhos-de-falha` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] Instalar o guard nos hooks de cada sombra e avisar do projeto in-repo sem guard
  - Files: packages/doctrina-cli/src/lib/workspace-agents.js, packages/doctrina-cli/src/lib/workspace-view.js
- [x] Não tratar placeholders como tarefas no cartão, no next e no delivery status
  - Files: packages/doctrina-cli/src/lib/task-card.js, packages/doctrina-cli/src/lib/actions.js, packages/doctrina-cli/src/lib/delivery.js, packages/doctrina-cli/src/commands/delivery.js
- [x] Manter a change abandonada no registro da entrega e não reaproveitar o número
  - Files: packages/doctrina-cli/src/commands/change.js, packages/doctrina-cli/src/commands/work.js, packages/doctrina-cli/src/lib/delivery.js
- [x] Recusar re-roteamento que deixa change órfã e reportar repositório movido
  - Files: packages/doctrina-cli/src/commands/delivery.js, packages/doctrina-cli/src/lib/workspace-view.js
- [x] Reconhecer clone de repositório sombra no next, no erro e no init
  - Files: packages/doctrina-cli/src/lib/workspace-view.js, packages/doctrina-cli/src/index.js, packages/doctrina-cli/src/commands/next.js, packages/doctrina-cli/src/commands/init.js
- [x] Responder em JSON quando o comando falha e dar payload ao delivery status
  - Files: packages/doctrina-cli/src/index.js, packages/doctrina-cli/src/lib/json-out.js, packages/doctrina-cli/src/commands/delivery.js
- [x] Testes reproduzidos no código antigo; docs EN e PT, ajuda e CHANGELOG
  - Verify: node --test packages/doctrina-cli/test/a-terceira-auditoria-fecha-os-caminhos-de-falha.test.js
