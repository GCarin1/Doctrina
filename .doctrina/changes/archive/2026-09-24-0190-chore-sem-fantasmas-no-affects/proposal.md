# Change 0190-chore-sem-fantasmas-no-affects — chore sem fantasmas no affects

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:** Doctrina maintainers
- **Lane:** product
- **Affects specs:** structure

- **Documented surface:** n/a — só um aviso falso do `validate` deixa de sair; `spec new` e `--chore` aparecem apenas na explicação


## Why

Toda change de chore é esboçada com `Affects specs: (none — chore)`, e a
checagem de capability fantasma (change 0108) lia as palavras do
cabeçalho como nomes: cada chore aberta gerava dois avisos, "names
\"none\"" e "names \"chore\"", sugerindo `doctrina spec new none`. Achado
ao preparar o release da 0.17.

## What

- A checagem ignora um cabeçalho "none"/"n/a" e os apartes entre
  parênteses.
- Teste novo em `a-ghost-reference-is-named.test.js`.

## Scope boundaries

- O formato do cabeçalho que o `work --chore` escreve não muda.

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

