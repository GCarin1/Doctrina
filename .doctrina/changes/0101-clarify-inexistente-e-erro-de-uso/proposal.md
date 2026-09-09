# Change 0101-clarify-inexistente-e-erro-de-uso — clarify inexistente e erro de uso

- **Status:** proposed
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** gates

## Why

clarify apontado para um arquivo que nao existe sai com a classe de gate em vez da classe de uso, divergindo de intake --file, init --intake-file e templates check --path

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
