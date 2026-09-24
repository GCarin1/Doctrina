# Change 0130-teste-degradacao-mede-orcamento — o teste de degradação mede o orçamento em vez de fixar 13000

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** chore — opened as chore
- **Affects specs:** (none — chore)

## Why

O teste que prova que um ADR degradado mantém título, decisão e ponteiro
para o texto completo rodava contra a árvore viva com um orçamento fixo:

    run(repoRoot, ["context", "cli", "--budget", "13000", "--concat"])

O comentário ao lado assumia a aposta em voz alta: "13000 fica entre o
núcleo irredutível deste pacote e seu tamanho cheio". Era verdade quando
foi escrito. O núcleo cresce a cada spec e a cada ADR acrescentados, e
quando ele passar de 13000 o teste quebra sem que nada de errado tenha
acontecido.

Medido hoje, o núcleo está em ~9554 tokens, restando 3446 de folga até o
limite de 13000 — cerca de 10% do pacote cheio deste repositório, que é
~32428. Um teste que reprova porque o projeto cresceu reporta o projeto
crescendo, que ninguém precisa saber, e ao mesmo tempo esconde a
regressão que ele existe para pegar.

## What

O teste passa a medir a janela em vez de adivinhá-la.

Duas sondas: um orçamento que nada consegue atender devolve o tamanho do
núcleo, que é a parte nunca degradada e nunca descartada; um orçamento
que ninguém precisa atender devolve o pacote cheio. O ponto médio entre
os dois está, por construção, dentro da janela de degradação.

A aposta que o comentário fazia vira asserção: se o núcleo alguma vez for
o pacote inteiro, não existe janela, e o teste diz isso com os dois
números em vez de falhar por uma string ausente.

Com os valores de hoje a folga até o núcleo vai de 3446 para 11437
tokens, e passa a acompanhar a árvore em vez de ser consumida por ela.

## Scope boundaries

Não toca os outros testes de orçamento que citam 13000 numa lista de
valores — aqueles tratam explicitamente os dois ramos, cabe e não cabe,
então crescer a árvore os move de ramo sem quebrá-los.

Não muda nada do comportamento de `context`.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Os 28 testes de `context-retrieval` passam.
- [x] O orçamento medido cai entre o núcleo e o pacote cheio.

## Open questions

Nenhuma.
