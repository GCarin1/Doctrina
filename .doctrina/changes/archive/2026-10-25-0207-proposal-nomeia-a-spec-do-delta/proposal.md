# Change 0207-proposal-nomeia-a-spec-do-delta — proposal nomeia a spec do delta

- **Status:** applied
- **Applied:** 2026-10-25
- **Date:** 2026-10-25
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain; signals: spec)
- **Affects specs:** authoring


## Why

Na auditoria num projeto simulado: `work "Add a version constant to
health"` esqueletizou `specs/health/delta.md` pelo ranking e deixou o
`Affects specs:` do proposal vazio. Só uma capability fixada com
`--capability` preenchia o header, então o proposal dizia que não afetava
spec nenhuma enquanto o delta mirava uma.

## What

- `addAffectedSpec` (lib/change-ops.js) acrescenta a capability ao header
  uma vez e reindexa a change; deixa o `(none — chore)` de uma chore.
- `work` chama-o para o delta que esqueletiza; `change delta` para o delta
  em que escreve.
- Teste `o-proposal-nomeia-a-spec-do-delta.test.js`; docs EN/PT; CHANGELOG.

## Scope boundaries

- Não remove capabilities do header quando um delta é apagado à mão.

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
