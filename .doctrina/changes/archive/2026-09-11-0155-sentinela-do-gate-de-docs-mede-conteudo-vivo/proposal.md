# Change 0155-sentinela-do-gate-de-docs-mede-conteudo-vivo — sentinela do gate de docs mede conteudo vivo

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** product
- **Affects specs:** gates
- **Documented surface:** n/a — cita `verify`, `archive` e o gate de docs para explicar quando a amostra muda; nenhum comando ou flag muda gates

<!--
Optional, and usually absent. The closing docs gate reads COMMAND and FLAG
names out of the prose below and asks for documentation when it finds any.
It cannot tell a change from a mention: explaining an effect, or writing a
Scope boundaries line about what this deliberately does NOT touch, names
things just as loudly as changing them would.

When that happens, say so on the record instead of forcing the close:

- **Documented surface:** n/a — names two commands to explain an effect; alters neither

`none` reads the same as `n/a`, and a BARE one silences nothing — the
reason is the declaration.
-->

## Why

O teste-sentinela do gate de docs mede uma razao sobre todas as proposals arquivadas com um limiar fixo, entao ele cai sozinho conforme a arvore cresce: as declaracoes de superficie citada, que silenciam o gate de proposito, entram na conta como se fossem perda de sensibilidade, e a razao acabou de cruzar o limiar. O close tambem nao pega isso porque verify roda antes do archive que acrescenta a amostra.

## What

O sentinela passa a medir uma amostra fixa: o prefixo cronológico das 120
primeiras changes arquivadas — os nomes de pasta começam pela data, então
ordenar é ordenar no tempo — e deixa de fora as proposals que carregam uma
declaração de superfície citada, que são silenciosas de propósito.

Com isso o número só se move por duas razões, que são exatamente as que o
teste existe para pegar: alguém enfraqueceu o extrator, ou alguém editou
proposals antigas. Trabalho novo não mexe nele.

Artefatos: `packages/doctrina-cli/test/citing-a-command-is-not-changing-it.test.js`,
delta na spec `gates`.

## Scope boundaries

A ordem do fechamento não muda. `verify` roda seis passos antes de
`archive` porque arquivar antes de saber que a build passa seria pior — a
lição aqui não é mover o passo, é que um teste não pode medir um acervo
que o próprio fechamento aumenta.

Os outros testes que leem a árvore viva usam pisos de tamanho ("o acervo é
real"), que só sobem. Nenhum outro tinha razão com limiar.

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
- [x] O sentinela passa e a amostra que ele mede não cresce com esta
      change nem com as próximas, em
      `packages/doctrina-cli/test/citing-a-command-is-not-changing-it.test.js`.

## Open questions

Nenhuma.
