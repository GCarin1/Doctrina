# Change 0127-declarar-gate-release-pode — declarar que o gate de release nao pode ser mais fraco que o gate de PR e faze-lo rodar verify e o harness empacotado

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** product (confident; signals: declarar)
- **Affects specs:** gates

## Why

O job de publicação rodava typecheck, a suíte de testes e `validate`, e
parava por aí. Todo pull request já roda isso e mais: o harness de
instalação empacotada, o check dos exemplos, coverage, trace, index-drift,
contract-check e docs-shape, em três sistemas operacionais e duas versões
de Node.

Ou seja, o gate mais fino do repositório era exatamente o que ficava
entre um defeito e o registry. Um release é o último momento em que um
defeito ainda é barato, e era o momento em que menos se checava.

A ausência mais cara era o harness empacotado. Três defeitos — C1, C2 e
C5 — foram invisíveis a partir de um checkout e óbvios a partir de uma
instalação empacotada, e é no publish que essa classe deixa de cair sobre
nós e passa a cair sobre quem instala.

Havia ainda uma permissão pedida e não usada: o job declara
`id-token: write`, que existe para assinar proveniência, e publicava sem
`--provenance`.

Nada disso estava declarado, então nada impedia o gate de encolher mais.
Era essa a lacuna: não a lista de passos, e sim a ausência de qualquer
afirmação sobre ela.

## What

O requisito novo diz que um release roda todo gate que um pull request já
roda, e não publica enquanto algum falhar.

Na prática o job passa a rodar `doctrina verify`, que executa os oito
checks declarados em `verify.json` — a mesma lista que a action de gates
usa, então isto continua sendo uma declaração só, e não uma segunda cópia
que deriva. Passa a rodar o harness empacotado. Passa a validar os
exemplos em modo estrito. E publica com `--provenance`, que é o que
justifica a permissão que já pedia.

O critério é sustentado por um teste que lê os dois workflows e afirma a
correspondência. Removi cada um dos quatro pontos para confirmar que o
teste reprova em cada caso, e ele reprova.

## Scope boundaries

Não replica a matriz de CI no release: três sistemas e duas versões de
Node são a forma do gate de PR, e um release roda uma vez. O que os dois
não podem divergir é em quais gates rodam, não em quantas vezes.

Não toca a fiação de credencial declarada no contrato — `NODE_AUTH_TOKEN`
vindo de `secrets:NPM_TOKEN` segue como está, e `contract check` segue
guardando o rename.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Os cinco testes do gate de release passam contra o workflow atual.
- [x] Enfraquecendo o workflow, os testes reprovam nos pontos removidos.

## Open questions

Nenhuma.
