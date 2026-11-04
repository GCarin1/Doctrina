# Tasks — Change 0233-a-segunda-auditoria-fecha-os-furos-do-fluxo

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0233-a-segunda-auditoria-fecha-os-furos-do-fluxo` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] Reconhecer scripts que ficam rodando e os que foram mandados terminar; não afirmar README inexistente
  - Files: packages/doctrina-cli/src/lib/code-inventory.js
- [x] Reimprimir o playbook de absorb e retomar o absorb com intake sem flag no workspace
  - Files: packages/doctrina-cli/src/commands/intake.js, packages/doctrina-cli/src/lib/workspace.js, packages/doctrina-cli/src/lib/workspace-view.js, packages/doctrina-cli/src/lib/workspace-agents.js, packages/doctrina-cli/src/commands/delivery.js
- [x] Recortar a spec sem comentários e o cartão pelo delta
  - Files: packages/doctrina-cli/src/lib/context-slice.js, packages/doctrina-cli/src/lib/task-card.js
- [x] Ranquear o work --delivery pela história; o next do repositório aponta a entrega
  - Files: packages/doctrina-cli/src/commands/work.js, packages/doctrina-cli/src/lib/actions.js
- [x] Avisar de dependência não declarada e aceitar attach --depends-on
  - Files: packages/doctrina-cli/src/lib/workspace-view.js, packages/doctrina-cli/src/commands/workspace.js
- [x] Teste de cada furo, reproduzido no código antigo; docs EN e PT e CHANGELOG
  - Verify: node --test packages/doctrina-cli/test/a-segunda-auditoria-fecha-o-fluxo-multi-repo.test.js
