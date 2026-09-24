# Change 0188-completion-sem-depreciados — completion sem depreciados

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:** Doctrina maintainers
- **Lane:** product
- **Affects specs:** cli


## Why

Os scripts de completação eram gerados do catálogo inteiro, então o tab
ainda oferecia `analyze`, `report`, `skill sync` e `templates
check|update` ao lado dos substitutos, depois de a ajuda, o AGENTS.md e
a documentação já os terem tirado da superfície.

## What

- `completion` gera bash, zsh e pwsh só das operações vivas.
- Teste `a-completacao-oferece-so-o-vivo.test.js`.

## Scope boundaries

- Os comandos depreciados continuam rodando; só deixam de ser sugeridos.

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

