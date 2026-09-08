# Change 0057-ausencia-nao-e-aprovacao — ausencia nao e aprovacao

- **Status:** applied
- **Applied:** 2026-09-08
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** gates

## Why

ausencia esta sendo reportada como aprovacao: coverage sem nenhum criterio sai 100% em prime status e report, e o placeholder de Realizes que o template escreve satisfaz o check feito para pegar a falta dele

## What

Duas metades do mesmo hábito: silêncio lido como aprovação.

- **A4.** `summarize()` projeta zero critérios em 100% (`totalCriteria === 0 ?
  100 : …`), e `prime`, `status` e `report` imprimem isso. O primeiro número que
  um projeto novo vê sobre si mesmo é um 100% que não significa nada. O `doctor`,
  lendo a mesma coleção, avisa — e a change 0037 unificou as vistas justamente
  para que não pudessem discordar.
- **A5.** O aviso de `Realizes:` ausente existe e é bom, mas qualquer valor o
  silencia — e o template escreve um valor: o próprio placeholder. No fluxo
  normal o check é código morto; quem paga é o `trace`, que reporta a intenção
  como dropped, longe da causa.

Cobertura sem critérios passa a ser ausência (`null`), não perfeição, e cada
vista renderiza isso como o `doctor` já faz. Um header ainda com o texto do
template conta como ausente — a maquinaria existe: `isUntouchedScaffold` compara
conteúdo com o template. Delta em `specs/gates`.

## Scope boundaries

- Não torna o aviso de `Realizes:` um erro: ele continua advertência, com o mesmo
  escape hatch deliberado (`n/a — <why>`) — o que muda é que o escape hatch para
  de vir pré-acionado pelo scaffold.
- Não muda o cálculo de coverage quando há critérios.

## Verification


- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Projeto sem critérios não mostra 100% em nenhuma vista.
- [x] Uma spec ativa com o placeholder do template intacto dispara o aviso de Realizes.
- [x] Uma spec com `n/a — <why>` deliberado continua silenciosa.

## Open questions

- Nenhuma.
