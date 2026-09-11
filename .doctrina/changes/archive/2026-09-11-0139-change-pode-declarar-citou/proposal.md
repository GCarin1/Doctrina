# Change 0139-change-pode-declarar-citou — uma change pode declarar que citou uma superficie sem alterar, em vez de forcar o close

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** product (confident; signals: change, declarar)
- **Affects specs:** gates

## Why

O gate de documentação do `close` lê NOMES do texto que o autor escreveu,
e um nome é tudo o que ele consegue enxergar.

Uma change que diz "o `coverage` não sabe que este teste existe" está
descrevendo um efeito. Uma linha de `## Scope boundaries` dizendo "não
toca `verify`" está descrevendo uma **ausência** — o oposto de mexer. As
duas chegam ao gate idênticas a uma change que altera o comando.

Aconteceu três vezes nesta sessão. As changes 0131, 0137 e 0138 foram
recusadas por nomes que apareciam só em explicação, e as duas primeiras
fecharam com `--force`.

O custo não é o incômodo. Um gate que se força com frequência deixa de ser
gate: o ledger enche de gaps que nunca foram gaps, e quando um gap de
verdade aparecer ele não vai saltar aos olhos. Foi exatamente o argumento
que a change 0129 usou para o aviso permanente do `coverage`, e é a mesma
classe de defeito num gate irmão — menção em prosa lida como reivindicação.

O gate já tem duas exclusões para isso: a faixa chore e a seção
`## Verification`. Elas cobrem os casos comuns e não o geral.

## What

Nenhuma extração mais esperta resolve o caso geral, porque a diferença
entre citar e alterar é semântica, e o ADR 0005 mantém semântica fora de um
gate determinístico. Então quem escreve declara:

    - **Documented surface:** n/a — nomeia dois comandos para explicar um efeito; não altera nenhum

`none` se lê igual a `n/a`. A gramática é a que a árvore já usa no
`Realizes: n/a — <porquê>`, e vale a mesma regra de dois eixos: um `n/a`
pelado é afirmação que ninguém escreveu, e não silencia nada. Sem essa
regra o cabeçalho viraria um interruptor para desligar o gate, que é pior
que os falsos positivos que ele responde.

A declaração é auditável: mora na proposta, aparece no diff e no `review`.

## Scope boundaries

Não mexe nas duas exclusões existentes nem no extrator de sinais. A
sensibilidade padrão do gate fica exatamente onde estava — uma change que
não declara nada é lida como antes.

Não relaxa o gate do changelog que a change 0135 criou: são perguntas
diferentes, e esta declaração responde só a de superfície.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Uma declaração com razão silencia; uma pelada, incluindo `n/a —`, não silencia.
- [x] Uma change que não declara nada continua sendo reportada como antes.

## Open questions

Nenhuma.
