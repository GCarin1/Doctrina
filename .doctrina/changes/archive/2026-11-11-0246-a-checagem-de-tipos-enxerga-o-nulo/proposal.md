# Change 0246-a-checagem-de-tipos-enxerga-o-nulo — a checagem de tipos enxerga o nulo

- **Status:** applied
- **Applied:** 2026-11-11
- **Date:** 2026-11-11
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain) — opened as chore
- **Affects specs:** gates

- **Documented surface:** n/a — configuração da checagem de tipos e anotações JSDoc; nenhum comando, flag ou saída muda


## Why

O `tsconfig.json` diz, no próprio comentário, que a checagem pega "uma função cujos chamadores discordam sobre ela retornar null". Com `strictNullChecks` desligado isso é falso: null e undefined pertencem a todo tipo e o verificador não enxerga o chamador que esqueceu um. Ligar a opção apontou 82 lugares.

## What

- `strictNullChecks: true` no `tsconfig.json`, com o motivo no comentário.
- A spec `gates` passa a declarar `scripts/release.mjs` (o script entrou na change 0245 e ficou sem dono; o teste de posse só enxerga arquivos versionados).
- Anotações JSDoc nos parâmetros com padrão `null`/`undefined` e nas listas vazias que o verificador lia como `never[]`; guardas onde um valor pode faltar (`?? []`, `?.`).
- O teste do typecheck exige a opção ligada.

## Scope boundaries

`strict` e `noImplicitAny` continuam desligados. Nenhum dos 82 pontos era um defeito alcançável hoje; o comportamento em tempo de execução não muda.

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
