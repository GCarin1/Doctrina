# Change 0055-comentario-nao-e-conteudo — comentario nao e conteudo

- **Status:** applied
- **Applied:** 2026-09-08
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain; signals: change)
- **Affects specs:** validation, insight, gates

## Why

o comentario RANKED GUESS do delta por palpite vira sinal de superficie documentada e faz o gate de docs recusar toda change do caminho padrao, e o show numera as cinco linhas da legenda do template como se fossem requisitos; um parser nao le dentro de comentario HTML

## What

Um comentário HTML é anotação, não conteúdo — e três parsers do projeto leem
dentro dele. O ADR 0021 já diz que a gramática on-disk tem um dono; esta change
aplica aos outros dois leitores a mesma regra que a spec `authoring` já declara
para blocos de ops ("não executar um bloco que está dentro de um comentário
HTML de um delta").

Dois defeitos, uma correção:

- **A1 (regressão da change 0044).** O comentário `RANKED GUESS` que o delta por
  palpite carrega contém `` `doctrina work` ``. O gate de docs subtrai o
  boilerplate dos templates antes de procurar sinais; o comentário de palpite não
  é template, passa pela subtração e é lido como sinal autoral. Toda change do
  caminho padrão chega ao passo 10 do close com `commands: work` e é recusada.
- **A2.** `parseRequirements` conta os bullets da legenda de sintaxe que o
  template escreve dentro de um comentário. Numa spec recém-scaffoldada,
  `show <cap>-R1..R5` devolve a legenda e o primeiro requisito real é `R6`. Não
  reproduz aqui porque as specs deste repositório tiveram o comentário apagado.

Deltas esperados em `specs/validation` (a regra), `specs/insight` (`show`) e
`specs/gates` (o gate de docs).

## Scope boundaries

- Não muda o texto do comentário de palpite nem o do template: o problema é quem
  lê, não o que está escrito.
- Não unifica a numeração do `show` com a do `replace-requirement` — são esquemas
  diferentes por motivos diferentes; esta change faz as duas pararem de contar
  comentário e documenta a relação no `--help`.
- Não mexe no `extractOps`, que já obedece à regra.

## Verification


- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Uma change com delta por palpite fecha sem sinal fantasma no gate de docs.
- [x] `show <cap>-R1` numa spec recém-scaffoldada devolve o primeiro requisito real.
- [x] Um teste roda contra uma spec criada por `spec new`, não contra as deste repositório.

## Open questions

- Nenhuma.
