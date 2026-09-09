# Change 0103-o-close-roda-o-contract-check-inteiro — o close roda o contract check inteiro

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product
- **Affects specs:** gates

## Why

o passo runtime do close roda só RT01-RT05 e aprova um contrato com porta duplicada e referência a spec inexistente que contract check reprova

## What

O `contract check` tinha duas metades: a estrutural, escrita inline no
comando (porta reclamada duas vezes, variável ausente do `.env.example`,
referência a spec inexistente), e RT01–RT05 em `lib/runtime.js`. O passo
`runtime` do `close` chamava só a coleção da lib. Medido:

```
contract check → fail 2 errors (port 8080 claimed by both…; references spec "fantasma"…)
close 0001     → ──── 5/12 runtime: ok 2 declared rows hold → change arquivada
```

O comentário acima do passo dizia que «the five can never disagree».
Discordavam. A metade estrutural passa a ser achados com código
(CT01 porta, CT02 drift do `.env.example`, CT03 referência) na mesma
coleção que RT01–RT05; `contract check`, o passo `runtime` do `close`,
`validate --runtime` e `doctor` leem a coleção inteira. O `doctor` também
deixa de chamar «unchecked» um contrato que tem erro estrutural e zero
linhas de Wiring: erro vem antes de «não declarado».

## Scope boundaries

- Não muda o que RT01–RT05 verificam nem seus códigos.
- Não muda a decisão da change 0029 de que um contrato sem linhas de
  Wiring/Selectors é «unchecked», exit 0 — só a ordem: um erro estrutural
  vence o «unchecked».
- Não toca no `triage`, que já lia a coleção e agora simplesmente vê os três
  códigos novos.

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
- [x] Um contrato que `contract check` reprova por CT01/CT03 para o `close` no passo `runtime`.
- [x] `doctor` reporta FAIL runtime com os mesmos códigos, mesmo sem linhas de Wiring.
- [x] Um contrato sem defeito estrutural e sem linhas continua «unchecked», exit 0.

## Open questions

- Nenhuma.
