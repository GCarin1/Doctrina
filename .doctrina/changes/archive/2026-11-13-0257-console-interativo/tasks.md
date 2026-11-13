# Tasks — Change 0257-console-interativo

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0257-console-interativo` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] O estado do painel lido da árvore
  - Files: packages/doctrina-cli/src/lib/console-state.js
- [x] A ponte com o agente: detecção, linha de comando, leitura do stream
  - Files: packages/doctrina-cli/src/lib/agent-bridge.js
- [x] O modelo: teclas, paleta de comandos e menções, histórico, efeitos
  - Files: packages/doctrina-cli/src/lib/console-model.js
- [x] A tela: gates, conversa, painel, caixa de entrada, layout estreito
  - Files: packages/doctrina-cli/src/lib/console-view.js
- [x] O comando ui e a abertura por doctrina sem argumentos
  - Files: packages/doctrina-cli/src/commands/ui.js, packages/doctrina-cli/src/index.js, packages/doctrina-cli/src/lib/commands.js
- [x] ADR 0032, política de segurança e teste de pacote
  - Files: SECURITY.md, scripts/e2e-packed.mjs
- [x] Testes, docs EN/PT, READMEs e CHANGELOG
  - Files: packages/doctrina-cli/test/o-console-da-um-rosto-ao-doctrina.test.js, docs/en/cli-reference.md, docs/pt/cli-reference.md, docs/en/getting-started.md, docs/pt/getting-started.md, README.md, README.pt.md, CHANGELOG.md
