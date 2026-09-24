# Change 0183-cli-ainda-indica-comandos — o CLI ainda indica comandos depreciados

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:** Doctrina maintainers
- **Lane:** product
- **Affects specs:** cli, authoring


## Why

A auditoria pós-0182 achou o CLI ensinando o caminho que acabou de
aposentar: `doctrina skill new` termina com "then run `doctrina skill
sync`" (depreciado na 0177), `doctrina work --help` descreve analyze →
apply → verify → archive → validate à mão, sem o `close`, e dois avisos
do `validate` dizem "analyze/apply will refuse it". O `close --help` abre
a sequência com `analyze`, um nome depreciado. Um nome depreciado continua
funcionando, então nenhum teste falhava.

## What

- `skill new` aponta para `doctrina index rebuild`.
- `work --help` (e a cli-reference e o getting-started, EN/PT) termina em
  `change check` e `close`.
- O primeiro passo do close passa a se chamar `structure` (o id interno
  continua `analyze`); `close --help`, flow e cli-reference acompanham.
- Os avisos do `validate` nomeiam `change apply`, `change check` e o close.
- Teste `o-cli-nao-indica-comando-depreciado.test.js` varre o `--help` de
  todo comando vivo.

## Scope boundaries

- Textos fora do CLI e de `docs/` (CONTRIBUTING, exemplos, skills) ficam
  para a 0184; ampliar o guarda de docs, para a 0185.

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

