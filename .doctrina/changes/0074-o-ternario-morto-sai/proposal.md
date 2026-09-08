# Change 0074-o-ternario-morto-sai — o ternario morto sai

- **Status:** proposed
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain; signals: change) — opened as chore
- **Affects specs:** (none — chore)

## Why

o helper markdownUnder do check-docs tem um ternario no-op cujos dois ramos sao identicos, deixado na change 0059

## What

No `scripts/check-docs.js:74`, dentro do helper `markdownUnder` que a change 0059
acrescentou:

```js
else if (entry.name.endsWith(".md")) out.push(path.relative(dir, full) === entry.name ? full : full);
```

Os dois ramos do ternário são idênticos. Não muda comportamento nenhum, mas lê
como se algo diferisse entre os casos — que é o custo real: o próximo leitor
gasta atenção procurando a diferença que não existe.

## Scope boundaries

- Chore: nenhuma spec muda, nenhum comportamento muda.
- Não reescreve o resto do helper.

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

## Open questions

- Nenhuma.
- [ ] O `check-docs` continua encontrando exatamente os mesmos arquivos.
- [ ] A suíte inteira passa.
