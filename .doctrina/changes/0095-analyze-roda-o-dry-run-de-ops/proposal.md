# Change 0095-analyze-roda-o-dry-run-de-ops — analyze roda o dry-run de ops

- **Status:** proposed
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product (uncertain; signals: change)
- **Affects specs:** gates

## Why

analyze declara ready to apply para um delta cujo bloco ops o apply depois recusa, entao o pre-flight nao inspeciona a unica coisa que ele existe para pre-flightar; change check ja executa esse dry-run e analyze nao

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
