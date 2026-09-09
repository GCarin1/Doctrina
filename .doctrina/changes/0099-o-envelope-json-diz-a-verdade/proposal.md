# Change 0099-o-envelope-json-diz-a-verdade — o envelope JSON diz a verdade

- **Status:** proposed
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** cli

## Why

o campo command do envelope embute o argumento em vez de nomear so a operacao, contradizendo o contrato que o proprio payload documenta; e uma flag desconhecida junto de json devolve stdout vazio, entao quem pediu JSON recebe erro de parsing em vez de um envelope que diz que recusou

## What

<!-- The shape of the change: artifacts created or modified, specs affected. -->

## Scope boundaries

<!-- Anything adjacent that this change deliberately does NOT touch. -->

## Verification

<!--
How you will know the change is correctly applied. Use checkboxes: every
box here is a claim that must be PROVEN before the change is done.
`doctrina change archive` refuses to archive while any box below is
unchecked (pass --force to archive anyway and record the gap). Distinguish
"task marked done" from "verification passed" — link the evidence.
-->

- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

<!-- List unresolved decisions. Empty if none. -->
