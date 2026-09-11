# Change 0129-coverage-so-cobra-como — coverage so cobra como prova os caminhos citados na clausula de evidencia, nao os nomeados na prosa do criterio

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** product (confident; signals: criterio)
- **Affects specs:** gates

## Why

`coverage` reportava, em toda execução, sobre o critério 72 da spec
`gates`:

    ! #72  also cites evidence that does not resolve:
           `specs/legacy.md`, `specs/carteira/spec-old.md`

Os dois arquivos não existem, e não deveriam existir: o critério os
descreve como o cenário que o teste constrói — "um `specs/legacy.md`
solto tira um warning". A prova de verdade vem depois, no
`verified by`, e resolve.

O extrator lia o corpo inteiro do critério e tratava todo caminho entre
crases como citação de prova. A change 0106 ensinou este módulo a apontar
um caminho citado que não resolve mesmo quando outro resolve, o que está
certo — uma prova válida não valida a outra. Mas 0106 não podia enxergar
as duas metades do critério, então passou a cobrar também o que o
critério apenas nomeia.

O resultado era um aviso permanente e sempre igual. Esse é o pior estado
possível para um gate: ele treina quem lê a pular a linha em que ele
aparece, e o custo disso é maior do que o do check. Num projeto cujo
argumento é ter gates honestos, um aviso que nunca muda é ruído que
desqualifica os avisos verdadeiros.

## What

`coverage` passa a separar o critério na sua marca de citação —
`verified by`, e as variantes `proven by`, `evidenced by`,
`demonstrated by` e `verificado por` — e a tratar como reivindicação de
prova apenas os caminhos que aparecem depois dela.

O que muda é só a cobrança. A resolução e a classificação continuam
idênticas: nenhum critério troca de estado, e a contagem segue em 100%.

Um critério sem marca de citação não perde nada: sem onde separar, todo
caminho continua sendo reivindicação, que é o que um projeto que não usa
esta gramática recebe.

## Scope boundaries

Não altera o heurístico que decide se um token parece caminho, nem a
isenção de diretórios e nomes sem barra que já existia.

Não toca o mesmo parser duplicado em `lib/criteria.js`, que alimenta
`why` e `validate`: lá os caminhos são usados para dizer o que um
critério cita, não para cobrar, e unificar os dois é refatoração com
change própria.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] O aviso permanente sobre o critério 72 desapareceu, com a contagem intacta.
- [x] Um caminho quebrado citado depois da marca continua sendo apontado.
- [x] Um critério sem marca mantém o comportamento anterior.

## Open questions

Nenhuma.
