# Change 0210-teste-do-lote-aceita-crlf — teste do lote aceita crlf

- **Status:** applied
- **Applied:** 2026-10-25
- **Date:** 2026-10-25
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain) — opened as chore
- **Affects specs:** (none — chore)

- **Documented surface:** n/a — só um teste muda; nenhum comando, flag ou saída


## Why

No CI do PR da 0.18.0, o teste `o-close-nao-se-repete.test.js` falhou nos
três Windows: o proposal esqueletizado lá é CRLF, e as regex do teste que
preenchem `## Why`/`## What` só aceitavam `\n`, então o close parava no
structure ("2 unwritten sections") e a seção de skills não era a que o teste
espera.

## What

- As duas regex do teste aceitam `\r?\n`.
- CHANGELOG, na seção 0.18.0 ainda não publicada.

## Scope boundaries

- O código do close não muda: o defeito era só do teste.

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

Nenhuma.
