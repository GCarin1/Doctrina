# Change 0122-harness-e2e-descobre-id — o harness e2e descobre o id da change em vez de fixar um literal

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** chore — opened as chore
- **Affects specs:** (none — chore)

## Why

O harness de instalação empacotada fixava o id da change que ele mesmo
abre:

    const changeId = "0001-add-refunds";

A change 0070 ensinou a derivação de slug a descartar stopwords, e `add`
está na lista. Desde então `doctrina work "add refunds"` abre
`0001-refunds`, e o harness procurava um diretório que o CLI nunca mais
criou.

O CLI está certo: a regra nova produz ids mais curtos, que é o ponto dela.
Quem ficou para trás foi o teste. O preço foi o job `End-to-end (packed
install)` vermelho em ubuntu e windows desde 8 de setembro, sobre uma
regra que o projeto adotou de propósito.

O defeito de fundo não é o literal errado, é haver um literal. Um teste
que repete a saída esperada de uma regra vira refém dessa regra, e a
regra é do CLI, não dele.

## What

O harness passa a perguntar à árvore qual change o `work` acabou de
abrir, através de um helper `openChangeIds()` que lista
`.doctrina/changes/`, descarta `archive/` e os dotfiles, e devolve os ids
ordenados.

O literal sai e entra uma asserção que afirma algo mais forte e mais
verdadeiro: que `work` abriu **exatamente uma** change. Era o que o
harness queria dizer o tempo todo, e é o que sobrevive ao próximo ajuste
na derivação de slug.

## Scope boundaries

Não altera a derivação de slug nem a lista de stopwords: o comportamento
do CLI está correto e permanece como está. Não toca as outras asserções
do harness, que já liam o id de uma variável.

Não corrige o `assert` que segue executando após uma falha, o que fez a
causa real aparecer no log como um `ENOENT` cru. É defeito próprio, com
change própria.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] `node scripts/e2e-packed.mjs` passa contra uma instalação empacotada.
- [x] A asserção nova reprova se `work` abrir zero ou mais de uma change.

## Open questions

Nenhuma.
