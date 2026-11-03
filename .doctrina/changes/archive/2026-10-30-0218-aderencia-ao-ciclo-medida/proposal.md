# Change 0218-aderencia-ao-ciclo-medida — aderencia ao ciclo medida

- **Status:** applied
- **Applied:** 2026-10-30
- **Date:** 2026-10-30
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** scaffolding


## Why

Review de campo: o agente "sabe que o framework existe" e, sem o nome dele no
pedido, vai direto ao código. As changes 0211 a 0217 apostam em mudar isso
(hooks, contrato, pacote enxuto); sem um número, ninguém sabe se mudou.

## What

- `computeSnapshot` (lib/metrics-model.js): `code_commits` e
  `change_adherence` — commits de código que tocaram `.doctrina/changes/` ou
  nomearam uma change; entra no `--save` e no `--trend`.
- `metrics --commands`: `context`, `close` e `prime` por `work`.
- Neste repositório: 97,9% de 143 commits de código.
- Teste `a-aderencia-ao-ciclo-e-medida.test.js`; help; docs EN/PT;
  CHANGELOG.

## Scope boundaries

- É um proxy: um ajuste de uma linha pode legitimamente não ter change.

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
