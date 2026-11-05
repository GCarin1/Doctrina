# Tasks — Change 0230-a-orientacao-funciona-na-raiz-do-workspace

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0230-a-orientacao-funciona-na-raiz-do-workspace` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] Decidir em lib/workspace-view.js o que next, handoff, status, validate e context dizem na raiz
  - Files: packages/doctrina-cli/src/lib/workspace-view.js
  - Verify: node --test packages/doctrina-cli/test/a-orientacao-funciona-na-raiz-do-workspace.test.js
- [x] Ligar os cinco comandos à raiz do workspace, sem nunca indicar init ali
- [x] Apontar cada lacuna do registro da entrega para o comando que a resolve
- [x] Nomear o workspace e a entrega aberta no prime de um repositório
- [x] Apontar next e handoff no hub gerado e documentar em help, cli-reference, workspace.md e no guia, EN e PT
