# Change 0069-non-goals-em-prosa-contam — non-goals em prosa contam

- **Status:** applied
- **Applied:** 2026-09-08
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** insight

## Why

o prime --rules reporta none declared e manda criar uma secao Non-goals que existe e esta preenchida, porque o leitor so conta bullets enquanto o comentario do proprio template convida prosa: o remedio nomeia uma acao ja feita

## What

O `product.md` tinha a seção `## Non-goals` preenchida, em prosa. O
`prime --rules` reportou que ela não existe, e o remédio nomeou uma ação já
feita:

```
  Non-goals  (.doctrina/product.md)
    none declared — add a `## Non-goals` section to product.md
```

O leitor só conta bullets. O comentário do próprio template para aquela seção —
`<!-- Explicit things this project will NOT try to be. -->` — não pede bullets,
convida prosa. Convertida para bullets, a seção aparece com os dois itens.

É a regra C2 deste repositório, que tem uma suíte inteira: um achado só pode
nomear um remédio que o resolve. Aqui o remédio não resolve nada, porque não há
nada a resolver.

## Scope boundaries

- Não muda o template do `product.md` nem passa a exigir bullets.
- Não mexe na leitura das âncoras de critério de sucesso (`[SC1]`), que o
  template documenta como bullets de propósito.

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

- Nenhuma.
- [ ] Uma seção `## Non-goals` em prosa é lida como preenchida.
- [ ] Uma seção genuinamente ausente ou vazia continua sendo reportada, com o remédio certo.
- [ ] Bullets continuam funcionando como funcionam hoje.
