# Change 0056-o-resumo-do-contract-check-nao-mente — o resumo do contract check nao mente

- **Status:** applied
- **Applied:** 2026-09-08
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** runtime (confident; signals: ci) — opened anyway (--force)
- **Affects specs:** gates

## Why

o resumo do contract check diz ok N contracts consistent para a mesma superficie que a linha acima declarou nao checada, e e esse o comando que roda no close e na action de CI

## What

A change 0029 estabeleceu que um contrato sem linhas de Wiring/Selectors é
reportado como NÃO CHECADO, nunca como aprovado. A linha por contrato obedece; a
linha de resumo — a que fica no log de CI e a que o `close` mostra — diz
`ok N contracts consistent`.

- O resumo passa a carregar a contagem de não checados.
- A palavra "consistent" só aparece quando houve algo a verificar.
- O nível fica decidido explicitamente: advertência com exit 0 é defensável;
  "consistent" sobre silêncio não é.
- Delta em `specs/gates`.

`doctor` e `triage` já renderizam o mesmo achado como "unchecked". As três
superfícies leem a mesma coleção e só a que é gate afirma o contrário — e é ela
que roda no `close` e na action publicada.

## Scope boundaries

- Não transforma "não checado" em falha: isso mudaria o gate para todo projeto
  que ainda não declarou wiring, e a 0029 decidiu deliberadamente o contrário.
- Não mexe nos checks RT01-RT05 nem no que eles reportam por linha.

## Verification


- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Um contrato sem Wiring/Selectors não produz a palavra "consistent" em lugar nenhum.
- [x] O resumo conta quantos contratos ficaram sem checar.
- [x] `contract check`, `doctor` e `triage` dizem a mesma coisa do mesmo estado.

## Open questions

- Nenhuma.
