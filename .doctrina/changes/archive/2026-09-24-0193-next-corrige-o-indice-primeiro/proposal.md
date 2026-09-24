# Change 0193-next-corrige-o-indice-primeiro — next corrige o índice primeiro

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:** Doctrina maintainers
- **Lane:** product
- **Affects specs:** cli


## Why

Na auditoria pós-0.17, depois de editar uma spec à mão, o `next` listou o
índice defasado em 5º, abaixo de lembretes consultivos como marcar os
critérios de sucesso do product.md. O índice defasado é erro no
`validate`, bloqueia o passo index-drift do close, se resolve com um
comando executável, e as ações listadas abaixo leem esse mesmo índice.
O comentário no código dizia "silent rot; surface it last", sem mais
razão; a ADR 0011, citada ao lado na documentação, trata de outra coisa.

## What

- `computeActions`: o drift do índice vem logo depois do intake/bootstrap,
  antes das changes abertas.
- cli-reference (EN/PT) e o requisito do `next` no spec `cli`, que também
  dizia apontar para `change new`/`spec new` quando não há trabalho — o
  código aponta para `work` ou `intake` desde a segunda auditoria.
- Teste em `actions.test.js`.

## Scope boundaries

- As declarações de runtime continuam em primeiro lugar.

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

