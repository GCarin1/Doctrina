# Change 0138-invariante-onde-ci-roda — o invariante de onde o CI roda ganha criterio, para a prova deixar de ser um teste orfao

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** product (uncertain; signals: criterio)
- **Affects specs:** gates

## Why

A change 0128 fez o CI disparar também em `develop`, e escreveu o teste
que guarda isso — o bloco `on:` tem de nomear toda branch onde o trabalho
chega, e o teste reprova quando uma sai da lista.

Por ter sido aberta na faixa chore, não produziu critério de aceitação.
O resultado é uma prova órfã: o teste existe e roda, mas nenhuma spec o
cita, então `coverage` não sabe que ele existe e `review` reporta o
arquivo como pertencente a nenhuma capacidade.

O invariante em si é dos mais simples e dos mais caros de perder: um gate
que não roda onde o trabalho chega não é um gate. Num PR para `develop`
isso não aparecia como falha, aparecia como uma aba de checks vazia — e
uma lista vazia não se parece com um problema.

Coisa escrita em teste e não escrita em spec é coisa que a próxima pessoa
pode remover sem atravessar nada.

## What

O invariante entra na spec `gates` como requisito ubíquo, e o teste que
já o guardava passa a ser a evidência citada por um critério.

Nada de código muda. O que muda é que a prova deixa de ser órfã: passa a
contar em `coverage`, e o arquivo passa a ter capacidade dona em
`review`.

## Scope boundaries

Não altera o `ci.yml` nem o teste, ambos corretos desde a change 0128.

Não propõe que toda change de faixa chore produza critério. A maioria não
deve mesmo — um lockfile regravado não é um invariante. O que esta change
corrige é um caso em que a faixa estava certa e o invariante, ainda assim,
merecia ficar escrito.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] O teste deixa de aparecer em `review` como arquivo sem capacidade.

## Open questions

Nenhuma.
