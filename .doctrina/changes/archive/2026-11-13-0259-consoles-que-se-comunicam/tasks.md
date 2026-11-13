# Tasks — Change 0259-consoles-que-se-comunicam

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0259-consoles-que-se-comunicam` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] A sala: cartões, caixas de entrada, mensagens
  - Files: packages/doctrina-cli/src/lib/console-room.js
- [x] O modelo: /peers, /send, /listen, receber, enfileirar, relatar
  - Files: packages/doctrina-cli/src/lib/console-model.js
- [x] A tela: consoles no cabeçalho e no painel, mensagens entre consoles
  - Files: packages/doctrina-cli/src/lib/console-view.js
- [x] O terminal: entrar na sala, o pulso, --send e --peers; o agente avisado
  - Files: packages/doctrina-cli/src/commands/ui.js, packages/doctrina-cli/src/lib/agent-bridge.js
- [x] ADR 0033, política de segurança, testes, docs EN/PT, READMEs e CHANGELOG
  - Files: packages/doctrina-cli/test/os-consoles-se-comunicam.test.js, SECURITY.md, docs/en/cli-reference.md, docs/pt/cli-reference.md, README.md, README.pt.md, CHANGELOG.md
