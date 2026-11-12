# Tasks — Change 0255-tres-trilhas-por-tamanho

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0255-tres-trilhas-por-tamanho` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] As trilhas e os sinais de edição direta
  - Files: packages/doctrina-cli/src/lib/triage-model.js
- [x] work responde a trilha direta; triage a imprime
  - Files: packages/doctrina-cli/src/commands/work.js, packages/doctrina-cli/src/commands/triage.js
- [x] A regra nas instruções permanentes
  - Files: AGENTS.md, .doctrina/templates/AGENTS.md.template, .doctrina/templates/adapters/cursor/.cursor/rules/00-doctrina.mdc.template, .cursor/rules/00-doctrina.mdc, packages/doctrina-cli/src/lib/views.js
- [x] A spec triage sai da authoring
  - Files: .doctrina/specs/triage/spec.md, .doctrina/specs/authoring/spec.md
- [x] Testes, docs EN/PT, READMEs e CHANGELOG
  - Files: packages/doctrina-cli/test/as-tres-trilhas-por-tamanho.test.js, docs/en/cli-reference.md, docs/pt/cli-reference.md, docs/en/adapters.md, docs/pt/adapters.md, README.md, README.pt.md, CHANGELOG.md
