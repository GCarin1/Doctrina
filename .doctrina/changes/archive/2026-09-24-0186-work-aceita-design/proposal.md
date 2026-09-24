# Change 0186-work-aceita-design — work aceita design

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:** Doctrina maintainers
- **Lane:** product
- **Affects specs:** authoring


## Why

O `work` é a porta recomendada e abre a change pelo mesmo caminho do
`change new`, mas recusava `--design` como flag não declarada (exit 2).
Uma change com escolhas não triviais tinha de sair da porta recomendada
para a manual só para ganhar um `design.md`. Era o único motivo concreto
para um agente usar `change new` em vez do `work`.

## What

- `work` declara `--design` e o repassa ao `change new`; ajuda e
  cli-reference (EN/PT) documentam a flag.
- Teste `o-work-esboca-o-design.test.js`.

## Scope boundaries

- `change new` não é depreciado: continua o primitivo do caminho manual, e
  o comando `change` segue existindo pelas outras operações, então nada
  sairia da ajuda nem do AGENTS.md.

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

