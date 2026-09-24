# Change 0141-fechar-entrada-deferred-sobre — fechar a entrada de deferred sobre macOS

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** chore — opened as chore
- **Affects specs:** (none — chore)

## Why

A change 0133 registrou em `deferred.md` a falha que só aparecia em macOS
com Node 20.12, com o gatilho para fechá-la: a próxima execução de CI
naquela perna.

A execução veio, a causa foi identificada — o CLI descartava o fim da
própria saída ao sair — e a change 0134 corrigiu. A matriz inteira passou,
nove jobs de nove, macOS incluído.

A entrada continuava aberta e, pior, apontava para a causa errada: ela
dizia que se a perna voltasse verde, a change 0130 teria sido tudo. Não
foi. A 0130 e a 0133 tornaram a falha legível; quem a resolveu foi a 0134,
e o defeito não tinha relação com macOS nem com o pacote de contexto.

Um registro de dívida que sobrevive à própria resolução é pior que não ter
registro: ele manda a próxima pessoa investigar o que já acabou, pela
pista errada.

## What

A entrada passa a `resolved`, nomeando a causa real — `process.exit()`
descartando stdout pendente em pipe —, por que o defeito escolheu uma
perna da matriz, e o que cada change contribuiu: 0130 e 0133 tornaram
legível, 0134 corrigiu.

Registra também o que a entrada anterior não podia saber: nunca foi sobre
macOS. Qualquer consumidor lendo este CLI por um pipe podia receber uma
resposta truncada com um `0` ao lado.

Em EN e PT.

## Scope boundaries

Não mexe nas outras entradas do `deferred.md`, entre elas a política de
fim de linha, que segue adiada com o raciocínio dela intacto.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] A matriz de CI fechou verde, nove jobs de nove, na primeira execução com a change 0134.

## Open questions

Nenhuma.
