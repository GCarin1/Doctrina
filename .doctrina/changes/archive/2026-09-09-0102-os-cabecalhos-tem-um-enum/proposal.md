# Change 0102-os-cabecalhos-tem-um-enum — os cabecalhos tem um enum

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product
- **Affects specs:** authoring, gates

## Why

spec set aceita --status bogus, --implementation banana e --criterion 2:banana, sincroniza o índice e validate passa com 0 erros; os enums de cabeçalho e de marca não existem

## What

`--version` e `--bump` sempre validaram o que recebem. `--status`,
`--implementation` e `--criterion` escreviam qualquer string, sincronizavam
o índice e o `validate` aceitava — medido num projeto adotante limpo:

```
spec set carteira --status bogus --criterion 2:banana   → updated, indexed
spec set relatorio --implementation banana               → updated, indexed
validate                                                 → ok 0 errors
prime | grep Work                                        → 2 specs (1 partial, 1 banana)
```

Todo gate ramifica sobre estas palavras (`active` liga a checagem de
critérios, `planned — nota` adia a cobertura, `[verified]` é a alegação que
o `coverage` mede). Uma palavra fora do domínio é um valor que nenhum ramo
lê — e o `prime` reporta "1 banana" como se fosse um estado.

O domínio passa a viver num só lugar (`lib/spec-ops.js`) e três portas o
leem: `spec set`, o bloco `ops` que um delta aplica (`set-header`,
`set-criterion`, `append-criterion`) e o `validate`, para o valor escrito à
mão. Uma nota depois da palavra continua válida; só a palavra é verificada.

## Scope boundaries

- Não muda o valor de nenhuma spec que já está correta: as 10 specs deste
  repositório usam só `active`, `implemented` e `[verified]`.
- Não muda a classe de saída da recusa: um valor fora do domínio no `spec
  set` cai na mesma trilha «operation error — spec left untouched» que
  `--bump huge` e `--version banana` já usam.
- Não valida `Realizes`, `Depends on` nem `Version` (este último já tinha
  gramática).

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
- [x] `spec set --status bogus`, `--implementation banana` e `--criterion 2:banana` recusam com a spec intocada.
- [x] `validate` reporta como `error` um `Status`, `Implementation` ou marca escritos à mão fora do domínio.
- [x] Uma nota depois da palavra (`planned — adiado`) continua aceita.

## Open questions

- Nenhuma.
