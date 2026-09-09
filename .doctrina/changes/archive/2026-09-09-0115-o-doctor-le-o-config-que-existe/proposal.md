# Change 0115-o-doctor-le-o-config-que-existe — o doctor le o config que existe

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product
- **Affects specs:** gates

## Why

doctor diz config ok sobre um config.json inválido e uma chave desconhecida é ignorada sem aviso

## What

Medido com `.doctrina/config.json` = `not json`, e depois `{"language":
"xx"}`:

```
doctor →  FAIL  validate   1 error · .doctrina/config.json is not valid JSON
          ok    config     all 3 options at their defaults
```

A linha `config` do `doctor` lê os valores efetivos e nunca os erros do
carregamento: sobre um arquivo que não parseia, diz «ok, tudo no default»
— o que é verdade dos valores e falso do arquivo, na mesma tela em que a
linha de cima o reprova. E `{"context_budjet": 1}` (uma chave com typo) é
silêncio em toda porta: o autor acredita que configurou.

A linha `config` passa a ser `fail` quando o carregamento reporta erros,
nomeando-os; `loadConfig` passa a devolver as chaves desconhecidas, que
`validate` e `doctor` reportam como `warning` com a lista das chaves
válidas.

## Scope boundaries

- Não muda o que é opção válida: `language`, `context_budget`, `rules` e o
  `$comment` do scaffold.
- Não muda os valores efetivos: uma chave desconhecida continua ignorada,
  só deixa de ser ignorada em silêncio.

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
- [x] Com um config inválido, a linha `config` do `doctor` é `fail` e nomeia o erro.
- [x] Uma chave desconhecida é um `warning` do `validate` e do `doctor`, com as chaves válidas na mensagem.

## Open questions

- Nenhuma.
