# Change 0169-valor-de-flag-malformado-reinterpretado — valor de flag malformado reinterpretado

- **Status:** applied
- **Applied:** 2026-09-23
- **Date:** 2026-09-23
- **Owner:**
- **Lane:** product
- **Affects specs:** cli


## Why

Três portas deixavam um erro de digitação passar como outro pedido, com exit 0 e resposta confiante:

- `metrics --since` entregava texto livre ao git, e o git nunca recusa uma data: `abc` vira AGORA (janela vazia, "nothing to measure", exit 0) e `2026-13-45` vira outro dia (12 commits medidos). O cabeçalho ecoava `window: abc` como se fosse válido.
- `parseInt` lia `7x` como 7 e `1.5` como 1 em `report --since`, `status --view report --since` e `context --budget`.
- `--budget -5` era lido como uma flag chamada `5`: a resposta era `unknown flag "--5"`, com a dica `did you mean --h?`, em vez do erro de faixa que o próprio `context` já tem.

Reproduzido neste repositório com cada um dos casos acima.

## What

- `packages/doctrina-cli/src/lib/args.js`: `parsePositiveInt` (só dígitos, acima de zero); depois de uma flag que leva valor, `-5` é o valor, porque nenhum nome de flag começa com dígito.
- `packages/doctrina-cli/src/lib/metrics-model.js`: `sinceWindow` aceita só formas de significado certo — contagem de dias, data de calendário real (`YYYY-MM-DD`) ou `<n> <unit>s ago`.
- `metrics.js` recusa (exit 2) a janela antes de olhar o histórico; `report.js`, `status.js` e `context.js` usam `parsePositiveInt`.
- Help do `metrics` e `docs/{en,pt}/cli-reference.md` descrevem as formas aceitas.

## Scope boundaries

- Formas do git como `yesterday` e `last monday` deixam de passar no `metrics --since`: são equivalentes a uma contagem de dias ou a `<n> <unit>s ago`, e aceitar texto livre é justamente o que deixava `abc` passar.
- Um `-5` solto, fora de uma flag que leva valor, continua lido como flag.
- `decision <verb> <n>` com `parseInt` no número da ADR não muda: aceitar `0001-slug` é recurso.

## Verification

- [x] `packages/doctrina-cli/test/um-valor-malformado-e-recusado.test.js` passa (4 testes); com os comandos anteriores o teste de ponta a ponta falha já no primeiro caso (`window: abc`).
- [x] Automated checks pass (`doctrina verify`).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

Nenhuma.
