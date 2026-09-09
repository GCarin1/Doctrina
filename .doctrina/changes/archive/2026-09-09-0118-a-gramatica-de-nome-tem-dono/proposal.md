# Change 0118-a-gramatica-de-nome-tem-dono — a gramatica de nome tem dono

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product (confident; signals: spec, requisito, declarar)
- **Affects specs:** authoring

## Why

A change 0110 criou `lib/names.js` e nenhuma spec o nomeia, então o arquivo fica sem capacidade dona e o gate `code-has-an-owner` recusa a árvore inteira.

a gramatica de nome partilhada vive num modulo que nenhuma spec nomeia, entao o arquivo nao tem capacidade dona e o gate de posse reprova; declarar o modulo canonico no requisito que descreve a regra, como a spec do cli ja faz com o catalogo de operacoes

## What

O requisito que descreve a gramática passa a nomear o módulo canônico, como a spec do `cli` já faz com `lib/commands.js`. Uma linha, um op `replace-requirement`.

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

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

<!-- List unresolved decisions. Empty if none. -->
