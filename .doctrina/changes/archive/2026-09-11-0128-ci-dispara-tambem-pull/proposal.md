# Change 0128-ci-dispara-tambem-pull — o CI dispara também em pull request para develop

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** chore — opened as chore
- **Affects specs:** (none — chore)

## Why

`ci.yml` disparava em `push` e `pull_request` apenas para `main`. Mas
`main` não é onde o trabalho chega: as branches de feature entram em
`develop`, e `develop` alcança `main` por um único pull request de
release.

O efeito é que um pull request para `develop` não rodava gate nenhum. A
primeira vez que qualquer coisa era checada era depois da integração —
que é justamente o momento em que um gate já não ajuda, porque a decisão
de mesclar já foi tomada. O PR #15 entrou exatamente assim.

Nada disso aparecia como falha. Aparecia como ausência, que é a forma
mais difícil de notar: a aba de checks de um PR para `develop` ficava
vazia, e uma lista vazia não se parece com um problema.

## What

Os dois gatilhos passam a listar `main` e `develop`.

Um teste passa a ler o bloco `on:` e afirmar que as duas branches estão
lá, e que tanto `push` quanto `pull_request` são gatilhos. A lista de
branches é uma linha de YAML que ninguém relê, e é por isso que ela ganha
uma asserção.

O teste lê apenas o bloco `on:`, não o arquivo inteiro, para que um nome
de branch citado num comentário ou num passo não seja confundido com um
gatilho.

## Scope boundaries

Não toca `pages.yml`, que publica a documentação e deve mesmo disparar só
em `main`: o site reflete o que foi liberado, não o que está em
integração.

Não muda o fluxo de branches nem propõe outro. A correção é fazer o gate
alcançar o fluxo que já existe.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] O teste passa contra o workflow atual e reprova quando `develop` é removido dos gatilhos.

## Open questions

Nenhuma.
