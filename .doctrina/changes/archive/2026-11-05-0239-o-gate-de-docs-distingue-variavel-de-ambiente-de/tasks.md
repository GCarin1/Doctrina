# Tasks — Change 0239-o-gate-de-docs-distingue-variavel-de-ambiente-de

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0239-o-gate-de-docs-distingue-variavel-de-ambiente-de` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] Reconhecer variável de ambiente por contexto, sufixo ou .env.example
  - Files: packages/doctrina-cli/src/lib/docs-impact.js
- [x] Teste reproduzido no código antigo; docs EN e PT e CHANGELOG
  - Verify: node --test packages/doctrina-cli/test/o-gate-de-docs-distingue-variavel-de-ambiente.test.js
