# Change 0144-declaracao-superficie-citada-aparece — a declaracao de superficie citada aparece onde o autor escreve e onde o gate recusa

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** gates

## Why

A change 0139 criou uma saída para o falso positivo do gate de docs: em vez
de forçar o close, o autor declara que os nomes na prosa são citação.

Ela existia em dois lugares — no código e na referência de CLI — e em
nenhum dos dois lugares onde o autor de fato está.

Não estava no template de proposta, que é onde ele escreve. E não estava na
mensagem com que o gate recusa, que oferecia apenas `--force`. Ou seja: a
pessoa olhando para um falso positivo era empurrada para a pior das duas
saídas, que enche o ledger de gaps que nunca foram gaps. Era exatamente o
que a 0139 existia para evitar.

É o anti-padrão que a skill `add-cli-command` deste projeto descreve com
todas as letras: um recurso que funciona, está especificado, e é invisível
onde alguém o procuraria.

E havia um defeito por baixo. A 0139 lia o cabeçalho do texto CRU da
proposta, e este módulo mascara comentários em todo o resto justamente
porque anotação não é conteúdo autorado. Consequência: um
`Documented surface:` dentro de comentário valia como declaração — e
colocar o exemplo no template, que é o conserto óbvio, teria desarmado o
gate para toda change criada a partir dele. O teste pegou isso antes do
commit.

## What

Três lugares.

O template de proposta ganha um bloco comentado que explica quando a
declaração cabe e mostra a forma, logo abaixo dos cabeçalhos.

A recusa do gate passa a nomear as duas saídas antes de oferecer a
terceira: documentar a superfície, ou declarar que os nomes são citação, e
só então `--force`.

E o cabeçalho passa a ser lido apenas do texto autorado, com a mesma
máscara de comentários que o módulo já aplica em todo o resto — de modo que
o exemplo do template não vale como declaração de ninguém.

## Scope boundaries

Não muda a regra de dois eixos: um `n/a` pelado continua não silenciando
nada. O que a 0139 decidiu segue decidido.

Não mexe na dica do gate de changelog, que já nomeia o remédio certo.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Uma declaração dentro de comentário não silencia o gate.
- [x] Uma change criada a partir do template publicado, com alteração real de superfície, continua sendo pega.
- [x] Uma declaração autorada, com razão, segue silenciando.

## Open questions

Nenhuma.
