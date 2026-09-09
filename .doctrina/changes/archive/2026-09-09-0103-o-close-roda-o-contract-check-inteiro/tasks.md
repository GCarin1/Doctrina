# Tasks — Change 0103-o-close-roda-o-contract-check-inteiro

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] Mover os três checks estruturais do `contract check` para `lib/runtime.js` como achados CT01–CT03, dentro de `collectRuntimeFindings`.
- [x] Fazer `contract check` renderizar a coleção compartilhada em vez da sua cópia inline.
- [x] Fazer o `doctor` reportar erro antes de «unchecked» quando um contrato sem linhas tem defeito estrutural.
- [x] Teste: a coleção, e `contract check`, `close` e `doctor` reprovando o mesmo contrato pelos mesmos códigos.
- [x] Documentar em `docs/en/gating.md` e `docs/pt/gating.md` que o passo runtime é o `contract check` inteiro.
- [x] Escrever o corpo EARS do delta `specs/gates`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-09-0103-o-close-roda-o-contract-check-inteiro/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
