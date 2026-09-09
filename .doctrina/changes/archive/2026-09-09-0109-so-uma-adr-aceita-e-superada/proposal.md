# Change 0109-so-uma-adr-aceita-e-superada — so uma ADR aceita e superada

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product
- **Affects specs:** authoring

## Why

decision supersede aceita uma ADR proposed como alvo e um número como título, criando 0003-0002.md

## What

Medido num projeto limpo, com 0001 e 0002 ainda `proposed`:

```
decision supersede 0001 0002   → created 0003-0002.md; 0001 → superseded by 0003
decision supersede 0002 0002   → created 0004-0002.md; 0002 → superseded by 0004
decision list                  → 0003  proposed  "0002" · 0004  proposed  "0002"
```

Duas coisas erradas numa chamada. Uma ADR `proposed` nunca foi regra:
superá-la cria uma cadeia de decisões que nunca valeram — o estado
correto para uma proposta que caiu é editar o `Status:` para `rejected`,
ou apagá-la. E um título que é só um número é, com quase certeza, a ordem
dos argumentos trocada (`supersede <alvo> "<título novo>"`), não o nome de
uma decisão.

`supersede` passa a exigir alvo `accepted` (mensagem com o estado atual e
o que fazer com uma proposta), e recusa um título composto só de dígitos,
apontando a gramática.

## Scope boundaries

- Não muda `accept`, `land` nem `scope`.
- Não adiciona um subcomando `reject`: editar o `Status:` de uma proposta
  continua sendo o caminho.

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
- [x] `supersede` de uma ADR `proposed` é recusado com o estado nomeado; de uma `accepted`, funciona como antes.
- [x] Um título só de dígitos é recusado com a gramática na dica.

## Open questions

- Nenhuma.
