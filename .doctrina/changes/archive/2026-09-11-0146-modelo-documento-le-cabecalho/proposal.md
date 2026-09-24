# Change 0146-modelo-documento-le-cabecalho — o modelo de documento nao le cabecalho dentro de comentario

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** chore (confident; signals: comentario)
- **Affects specs:** validation
- **Documented surface:** n/a — nomeia leitores internos do modelo; nenhum comando, flag ou código de saída muda

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

O modelo de documento é, por declaração do próprio módulo, o dono da regra
de que um comentário HTML é anotação e não conteúdo. Os módulos vizinhos
deferem a ele justamente por isso.

Os dois leitores de cabeçalho não aplicavam a regra do próprio módulo.

O preâmbulo é exatamente onde um template põe a orientação, então um
cabeçalho de EXEMPLO — escrito para mostrar a forma a quem vai autorar —
contava como cabeçalho autorado.

Apareceu como DISCORDÂNCIA, não como resposta errada, que é o que o tornava
difícil de ver: o `readHeader` pega a primeira ocorrência no documento
inteiro, o `readAllHeaders` coleta todas as do preâmbulo, e um exemplo
comentado fazia os dois devolverem conjuntos diferentes. O teste de
round-trip sobre a árvore real pegou no instante em que o template de
proposta ganhou um exemplo assim.

O defeito é anterior ao exemplo. O que o exemplo fez foi tornar alcançável
uma inconsistência que estava lá esperando por um template com orientação
no preâmbulo — que é o lugar onde orientação mora.

## What

Os dois leitores passam a casar contra o texto mascarado. A máscara troca o
conteúdo do comentário por espaços e preserva cada quebra de linha, então
offsets e números de linha continuam sendo os do documento, e o `raw`
devolvido continua sendo a linha real.

O `setHeader` passa a escrever por OFFSET, sobre a linha que o leitor de
fato encontrou. Substituir por padrão acharia a primeira ocorrência textual
— que, agora que a leitura pula anotação, pode ser um exemplo comentado
acima do cabeçalho verdadeiro. Sem isso, escrever um cabeçalho reescreveria
o exemplo do template e deixaria o real intacto.

## Scope boundaries

Não muda a gramática de cabeçalho nem a forma canônica de escrita. O que
muda é onde ela é procurada.

Não mexe no template que expôs o defeito: ele está correto, e o exemplo
comentado é o lugar certo para ele.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Um cabeçalho dentro de comentário não é coletado por nenhum dos dois leitores.
- [x] Um cabeçalho real ao lado de um exemplo comentado é o que os dois devolvem, e é o que o writer sobrescreve.
- [x] A suíte inteira passa, 891 testes, incluindo o round-trip sobre a árvore real.

## Open questions

Nenhuma.
