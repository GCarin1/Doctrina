# Tasks — Change 0232-o-change-check-ve-o-que-o-clarify-vera

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked and
`doctrina close 0232-o-change-check-ve-o-que-o-clarify-vera` succeeds — the close applies the deltas,
archives the change and updates the index, so those are not boxes here.
-->

- [x] Mover o scanner do clarify para lib/clarify-scan.js sem mudar o que o clarify relata
  - Files: packages/doctrina-cli/src/lib/clarify-scan.js, packages/doctrina-cli/src/commands/clarify.js
- [x] Avisar no change check das palavras vagas que cada delta escreve na spec
  - Verify: node --test packages/doctrina-cli/test/o-change-delta-escreve-as-ops.test.js
- [x] Documentar em cli-reference EN e PT e no CHANGELOG
