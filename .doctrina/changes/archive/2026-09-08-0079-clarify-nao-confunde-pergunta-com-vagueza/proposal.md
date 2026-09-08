# Change 0079-clarify-nao-confunde-pergunta-com-vagueza — clarify nao confunde pergunta com vagueza

- **Status:** applied
- **Applied:** 2026-09-08
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** gates

## Why

o clarify casa o quantificador many dentro da expressao interrogativa how many, entao cinco dos dezessete smells deste repo sao falsos positivos e o gate ensina a ser ignorado

## What

O padrão do `clarify` (`packages/doctrina-cli/src/commands/clarify.js:31`) é

```js
re: /\b(many|few|some|several)\b(?!\s+\d)/gi,
```

O lookahead já reconhece que «many 5» não é vago. Falta reconhecer que
**«how many» também não é** — é interrogativo, e um requisito que diz «shall
report how many contracts declared no rows» é o oposto de vago: ele nomeia
exatamente o número que o comando deve imprimir.

Cinco dos dezessete smells deste repositório são isso:

```
.doctrina/specs/gates/spec.md:178, 251, 252, 254
.doctrina/specs/scaffolding/spec.md:183
```

Um gate que chora lobo ensina a ser ignorado — e é justamente o que aconteceu
com o achado verdadeiro escondido no meio: `scaffolding/spec.md:183` diz «name
some of them» sem dizer quantos, e ninguém olhou, porque as outras quatro
linhas do mesmo arquivo eram ruído.

O escape hatch `<!-- clarify:ok -->` existe, mas anotar cinco linhas para
calar um falso positivo estrutural é pagar o preço do defeito em vez de
corrigi-lo.

## Scope boundaries

- Não afrouxa o vocabulário: `some`, `several`, `many` e `few` continuam
  sendo smells onde de fato quantificam.
- Não mexe no escape hatch `<!-- clarify:ok -->`, que continua sendo para
  o caso genuinamente aceito pelo autor.

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
- [x] «how many» deixa de contar como smell, em EN e PT.
- [x] «some of them» continua contando.
- [x] O achado verdadeiro em `scaffolding/spec.md:183` é corrigido, não anotado.

## Open questions

- Nenhuma.
