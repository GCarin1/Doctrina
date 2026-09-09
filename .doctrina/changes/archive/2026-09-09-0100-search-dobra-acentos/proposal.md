# Change 0100-search-dobra-acentos — search dobra acentos

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** insight

## Why

search casa substring crua e nao dobra acentos, entao uma busca digitada sem acento nao encontra o texto acentuado, enquanto o lexico compartilhado que work e context usam ja dobra
## What

`search` passa a dobrar acentos pelo léxico partilhado (`lib/lexicon.js`),
nos três pontos onde comparava texto cru: os termos da query, cada linha
lida e o nome do arquivo.

Terceira auditoria, achado 8 — com a direção corrigida. O relatório dizia
que a busca ACENTUADA falhava; é o contrário. O `search` casava substring
crua, então a query acentuada encontrava o texto acentuado e a query SEM
acento é que não encontrava nada. O defeito real é pior do que o descrito:
quem digita sem acento — o caso comum — era quem não achava.

A ADR 0040 já tinha feito o `work` e o `context --for` dobrarem. O `search`
era a única superfície de recuperação ainda a decidir por conta própria.

## Scope boundaries

- Não muda o ranqueamento nem os pesos do `lineScore`/`filenameBonus`: só o que conta como igual.
- Não dobra o texto EXIBIDO; o resultado mostra a linha como está no arquivo.
- Não toca a busca por frase, que já se constrói a partir dos termos e portanto herda a dobra.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project’s typecheck/test/build).
- [x] The affected spec’s acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Uma query sem acento encontra o texto acentuado, e o inverso também.
- [x] Dobrar não faz a busca casar tudo — um termo ausente continua sem resultado.

## Open questions

- Nenhuma.
