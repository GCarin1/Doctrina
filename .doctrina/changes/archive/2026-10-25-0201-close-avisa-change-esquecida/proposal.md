# Change 0201-close-avisa-change-esquecida — close avisa change esquecida

- **Status:** applied
- **Applied:** 2026-10-25
- **Date:** 2026-10-25
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain; signals: change)
- **Affects specs:** gates, cli, insight


## Why

Uma review de campo da 0.17: "a change 0078 foi publicada mas ficou aberta, e
nenhum fechamento seguinte avisou". Reproduzido: o close de outra change não
diz nada sobre as demais. O `prime` e o `next` listam a change aplicada — e
mandam rodar `change archive` à mão, o caminho que passa por fora do verify,
do coverage e do gate de docs que a 0.17 aposentou em favor do `close`. O
mesmo vale para a change sem delta, apontada para `change apply`.

## What

- `unfinishedChanges` e `ageDays` em lib/snapshot.js; o close termina com
  `other open changes (advisory)`: a que parece terminada e nunca fechou, e
  a aberta há 7 dias ou mais, ganham uma linha; o resto vira contagem.
- `prime` mostra `open Nd` a partir de 7 dias.
- `next`: `change-archive-pending` e `change-deltas-missing` apontam para
  `doctrina close <id>`; `next --run` sabe rodar o close.
- Teste `o-close-avisa-a-change-esquecida.test.js`; docs EN/PT; CHANGELOG.

## Scope boundaries

- O aviso é advisory: nunca muda o exit code do close.
- O limiar de 7 dias é fixo; não vira configuração nesta change.

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
