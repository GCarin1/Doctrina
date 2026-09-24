# Change 0192-lane-sobrevive-ao-arquivamento — lane sobrevive ao arquivamento

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:** Doctrina maintainers
- **Lane:** product
- **Affects specs:** insight


## Why

A change 0042 passou a registrar a lane na proposal para o relatório
responder "que tipo de trabalho o período teve?". Mas o índice só guardava
a lane de change aberta: `change archive` e `index rebuild` montavam cada
um a sua entrada arquivada, e nenhum incluía a lane. No repositório, a
seção "Lanes" do `status --view report` dizia "unknown: 163", embora 138
proposals arquivadas registrassem a lane. Achado na auditoria pós-0.17.

## What

- `archivedChangeEntry` em `lib/scan.js`: um construtor só para a entrada
  arquivada, usado pelo rebuild e pelo `change archive`, com a lane.
- Índice reconstruído: o relatório agora conta product 115, chore 19,
  runtime 5 e unknown 25 (as changes anteriores à 0042).
- Teste `a-lane-sobrevive-ao-arquivamento.test.js`.

## Scope boundaries

- O formato do cabeçalho `Lane` (veredito do classificador + override) não
  muda: ele existe para calibrar o classificador (change 0042).

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

