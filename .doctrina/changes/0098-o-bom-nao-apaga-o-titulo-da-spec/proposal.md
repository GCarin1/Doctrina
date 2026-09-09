# Change 0098-o-bom-nao-apaga-o-titulo-da-spec — o BOM nao apaga o titulo da spec

- **Status:** proposed
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product (uncertain; signals: spec)
- **Affects specs:** validation

## Why

um arquivo salvo com byte order mark faz o validate declarar que a spec nao tem titulo enquanto show, spec list e coverage leem o mesmo arquivo sem problema, entao a leitura do documento precisa remover o BOM uma vez no modelo de documento

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
