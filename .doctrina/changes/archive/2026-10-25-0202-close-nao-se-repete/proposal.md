# Change 0202-close-nao-se-repete — close nao se repete

- **Status:** applied
- **Applied:** 2026-10-25
- **Date:** 2026-10-25
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** gates, skills


## Why

Uma review de campo da 0.17: o fechamento "repete as mesmas 13 skills
sugeridas". O close imprimia a listagem inteira do `skill suggest` no fim de
cada close — uma vez por id num lote — tivesse ou não algo novo nela. E o
passo de docs imprimia "touches no documented surface" duas vezes (docs e
changelog), lido como dois checks.

## What

- `skillCandidates` sai de commands/skill.js para lib/skill-candidates.js
  (ADR 0025); `skill suggest` e o close leem a mesma coleção.
- O close imprime a seção de skills uma vez por execução: nomeia a
  candidata de uma change fix-shaped recém-fechada, com `skill new`, e
  conta as demais; sem candidata, não imprime nada.
- O passo de docs imprime a linha uma vez quando as duas respostas são
  iguais.
- Teste `o-close-nao-se-repete.test.js`; teste de integração do lote
  ajustado; docs EN/PT; CHANGELOG.

## Scope boundaries

- `skill suggest` continua listando tudo, como antes.

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
