# Change 0084-a-expansao-de-chaves-esta-certa — a expansao de chaves esta certa

- **Status:** proposed
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** gates

## Why

o expandBraces compila o glob original quando a expansao produz uma alternativa so, e casa o par errado de chaves quando elas estao aninhadas, produzindo correspondencia parcial em silencio

## What

Dois defeitos no `expandBraces`/`globToRegExp`, introduzidos pela change 0077
e encontrados pela auditoria seguinte sobre o próprio código dela.

**1. A expansão é calculada e descartada quando dá uma alternativa só.**

```js
const alternatives = expandBraces(glob);
if (alternatives.length > 1) { ... }   // só aqui a expansão é usada
// abaixo, o glob ORIGINAL é compilado, com as chaves literais
```

Resultado: `src/{a}.js` não casa `src/a.js`. Barulhento, não silencioso — o
check 8h do `validate` reporta «pattern matches no file».

**2. Chaves aninhadas casam o par errado.**

`indexOf("}")` acha a primeira chave de fechamento, não a correspondente:

```
src/{a,{b,c}}.js  →  ["src/a}.js", "src/b.js", "src/c}.js"]
```

Casa `src/b.js`, não casa `src/a.js` nem `src/c.js`, e inventa `src/a}.js`.
Este é o pior dos dois: como *alguma coisa* casou, o `validate` fica quieto e
a declaração parece cobrir o que não cobre.

Um `**Source:**` é uma afirmação sobre que código pertence a quem, e o
`review` decide a partir dela. Uma correspondência parcial silenciosa é
precisamente a falha que o ADR 0027 existe para eliminar.

## Scope boundaries

- Não amplia o dialeto de glob: `*`, `**`, `?` e `{a,b}` continuam sendo tudo
  o que existe, e nada além disso passa a ter significado.
- Não muda o que os Selectors de contrato já casam hoje.

## Verification

<!--
How you will know the change is correctly applied. Use checkboxes: every
box here is a claim that must be PROVEN before the change is done.
`doctrina change archive` refuses to archive while any box below is
unchecked (pass --force to archive anyway and record the gap). Distinguish
"task marked done" from "verification passed" — link the evidence.
-->

- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [ ] Um grupo de um elemento só casa o que ele nomeia.
- [ ] Chaves aninhadas casam exatamente as alternativas que descrevem.
- [ ] Uma chave sem par não vira correspondência parcial silenciosa.
- [ ] Os padrões que já funcionavam continuam idênticos.

## Open questions

- Nenhuma.
