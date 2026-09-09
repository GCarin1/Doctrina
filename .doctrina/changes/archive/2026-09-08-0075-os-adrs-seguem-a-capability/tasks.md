# Tasks — Change 0075-os-adrs-seguem-a-capability

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

<!-- Planejado, nao iniciado. Retome com `doctrina work --resume 0075-os-adrs-seguem-a-capability`. -->

- [x] Levantar, ADR a ADR, quais decidem comportamento que hoje mora em `authoring`.
- [x] Reescopar os que estiverem errados com `doctrina decision scope --write`, conferindo cada sugestão antes de escrever.
- [x] Remedir os onze pacotes e registrar a diferença de omissões no proposal.
- [x] Escrever o teste que impede a reincidência: uma operação declarada por uma spec e governada por um ADR exige que o ADR nomeie essa capability.
- [x] Escrever o corpo EARS do delta `specs/authoring`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-09-08-0075-os-adrs-seguem-a-capability/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
