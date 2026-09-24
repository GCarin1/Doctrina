# Change 0191-slug-mantem-numeros — slug mantém números

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:** Doctrina maintainers
- **Lane:** product
- **Affects specs:** authoring


## Why

O slug do id derivado do prompt usava o tokenizador da busca, que só
guarda palavras que começam por letra. `work "cortar a 0.17.0"` abriu a
change `0189-cortar`: a versão, que era a única informação do pedido,
sumiu. O mesmo com "migrar para Node 24" → `migrar-node`.

## What

- `slugFromPrompt` lê os próprios tokens: número e versão contam como
  uma palavra (pontos viram hífen); stopwords e palavras de uma letra
  continuam fora.
- Slugs de prompts sem número não mudam.
- Teste em `change-title.test.js`.

## Scope boundaries

- O tokenizador da busca (`terms`) não muda: lá um "24" solto casaria com
  tudo.

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

