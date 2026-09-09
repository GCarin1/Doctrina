# Change 0108-uma-referencia-fantasma-e-apontada — uma referencia fantasma e apontada

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product
- **Affects specs:** gates

## Why

Depends on e Affects specs aceitam uma capability sem spec sem nenhum gate reclamar; uma âncora SC1 duplicada em product.md é invisível para trace e validate

## What

Três referências que apontam para nada, e nenhuma porta que diga. Medido:

```
**Depends on:** carteira, fantasma     → validate, review, analyze, close: mudos
                                         why: "depends on: carteira, fantasma"
                                         context: descarta em silêncio
**Affects specs:** carteira, fantasma  → analyze, check, close: mudos
- [SC1] ...  (duas vezes em product.md) → trace --strict: ok 2 of 2; why/intent list: só a primeira
```

Contraste: `**Realizes:** SC9` é apontado como *dangling* pelo `trace`. A
mesma classe de referência — um nome para um artefato — tinha um gate num
cabeçalho e nenhum nos outros três.

- `Depends on` para uma capability sem spec é `error` no `validate`: o
  cabeçalho alimenta o pack, o grafo do `why` e o `review`.
- `Affects specs` para uma capability sem spec e sem delta ADDED na própria
  change é `warning` no `validate` (a change ainda é rascunho).
- Uma âncora `[SC1]` declarada duas vezes em `product.md` é `error` no
  `validate` e é nomeada pelo `trace`, que deixa de deduplicar em silêncio.

## Scope boundaries

- Não muda o que `Realizes` já faz no `trace`.
- Não passa a inferir dependências pela prosa: só o cabeçalho é lido.
- Não muda `why` nem `context`: com o gate no `validate`, uma referência
  fantasma não chega a eles.

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
- [x] `Depends on: fantasma` é um `error` do `validate` que nomeia a spec e o remédio.
- [x] `Affects specs: fantasma` sem delta ADDED é um `warning` do `validate`; com delta ADDED, silêncio.
- [x] `[SC1]` duplicado é `error` do `validate` e é nomeado pelo `trace`.

## Open questions

- Nenhuma.
