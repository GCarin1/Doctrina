# Change 0133-teste-pacote-contexto-diz — o teste do pacote de contexto diz qual elo quebrou

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** chore — opened as chore
- **Affects specs:** (none — chore)

## Why

Dois testes falham em macOS com Node 20.12 e em nenhuma outra perna da
matriz — nem Linux, nem Windows, nem macOS com Node 22. Estão vermelhos
desde pelo menos 2026-08-06.

Os dois são sobre montagem de contexto, e os dois viram um pacote MENOR
do que deveria. Um esperava `.doctrina/product.md` na saída `--concat` e
recebeu um pacote que terminava depois do `AGENTS.md`. O outro esperava
algum ADR resumido sob orçamento fixo e não encontrou nada degradado, que
é exatamente o que um pacote menor produz.

O problema para quem lê o log é que a asserção que falhava era uma só:
um regex ausente. Entre "o `init` não escreveu o arquivo" e "a
renderização não imprimiu a seção" há cinco elos possíveis, e o teste não
distinguia nenhum deles. Cinco semanas de vermelho sem diagnóstico é o
que uma asserção monolítica custa.

A hipótese óbvia — diretório de trabalho por symlink, já que o macOS
resolve `/var/folders/...` para `/private/var/...` e o `os.tmpdir()` mora
ali — foi reproduzida no Linux com um symlink explícito e **não**
reproduziu a falha. Está descartada.

Sem um runner macOS a causa não se fecha aqui. O que se pode fazer é
garantir que a próxima execução naquela perna a nomeie.

## What

O teste é desmontado nos seus cinco elos, checados em ordem, cada um
dizendo o que encontrou quando quebra:

1. o `init` saiu 0, com a saída dele na mensagem;
2. `.doctrina/product.md` existe em disco, com a listagem do diretório
   quando não existe;
3. a listagem escopada do pacote já nomeia `product.md` — se não nomear,
   a falha é de MONTAGEM e o `--concat` é a jusante dela;
4. o `--concat` saiu 0;
5. a renderização imprimiu as seções, e a mensagem traz a lista de
   cabeçalhos que ela de fato imprimiu.

A promessa do teste é a mesma de antes. O que muda é que ela deixa de ser
um regex e passa a ser uma cadeia.

A investigação em aberto entra em `docs/en/deferred.md` e
`docs/pt/deferred.md`, com o que foi descartado, o que foi feito e o
gatilho para fechar: a próxima execução em macOS com Node 20.12.

## Scope boundaries

Não retira o Node 20.12 da matriz e não marca teste como skip. A perna
está vermelha por um motivo real e ainda desconhecido; escondê-la
trocaria um defeito por um silêncio.

Não mexe na montagem do pacote. Mudar o código a partir de uma hipótese
que não reproduz seria adivinhação, e a única hipótese testável já foi
descartada.

O segundo teste da dupla não é tocado aqui: a change 0130 já o desamarrou
do orçamento fixo, e um pacote menor em qualquer plataforma não o quebra
mais.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] O teste passa no Linux, e cada elo falha com mensagem própria.
- [x] A hipótese do symlink foi reproduzida no Linux e não reproduz a falha.

## Open questions

A causa da falha em macOS com Node 20.12 segue aberta, registrada em
`deferred.md` com o gatilho para fechá-la.
