# Change 0044-o-delta-e-sempre-scaffoldado — o delta e sempre scaffoldado

- **Status:** applied
- **Applied:** 2026-09-07
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** cli

## Why

o delta so ganha Operation prefilled quando o usuario passa --capability, entao no caminho padrao o agente escreve do zero o arquivo cujo cabecalho ausente explodia dias depois; scaffoldar tambem a partir de um palpite ranqueado com margem, marcado como palpite

## What

`doctrina work` passa a scaffoldar o delta também quando a capacidade veio do
ranqueamento e não de `--capability`, desde que o primeiro colocado tenha margem sobre
o segundo — a mesma noção de confiança que `classify()` já usa para as lanes.

- O delta scaffoldado por palpite carrega um comentário dizendo que é palpite e como corrigir.
- Sem margem, o comportamento atual permanece: nenhum delta, o playbook instrui.
- Delta em `specs/cli`.

Achado F18 da auditoria. O comentário no próprio `work.js` diz que o delta era "o único
arquivo 100% escrito à mão, e aquele cujo `**Operation:**` ausente explodia dias depois
no analyze". A correção existe, mas só sob `--capability`; no caminho padrão o agente
recebe `<capability>` literal e escreve do zero. Um arquivo errado e óbvio custa menos
que um arquivo ausente e silencioso.

## Scope boundaries

- Não altera o ranqueador: isso é a change 0040, e as duas devem aterrissar em ordem.
- Não scaffolda nada no caminho `--chore`, que é spec-less por definição.
- Não scaffolda quando não há margem — um palpite fraco em pasta errada é pior que nenhum.
- Não scaffolda no `--from-diff`: o ranqueador de diff pontua em outra escala
  (caminho/citação, sem termo de densidade), então `CONFIDENT_MARGIN` não
  transfere para ele, e um backfill normalmente toca várias capabilities de
  uma vez — um único vencedor esqueletizado seria a forma errada ali.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Um prompt com vencedor claro no ranking abre a change já com o delta e o `Operation` correto.
- [x] Um prompt sem margem não scaffolda delta nenhum.
- [x] O delta por palpite carrega a marca e a instrução de correção.

## Open questions

- **Qual margem? — Resolvido: 10 pontos de score, que é "um termo casado
  inteiro".** Nenhuma das duas opções da pergunta, e a razão é a mesma para
  as duas: `>= 2` do `triage` é uma UNIDADE, não uma noção — lá cada sinal
  vale 1, aqui `score()` vale 100 por termo no nome, 10 por termo no corpo e
  até 9 de densidade. Copiar o número importaria uma escala alheia: uma
  diferença de 2 aqui significa que as duas specs casaram exatamente os
  mesmos termos e uma delas é mais curta — o oposto de confiança. E a
  diferença relativa (`a / b`) resolveria o mesmo problema introduzindo um
  segundo cálculo sobre uma projeção que já existe, contra o princípio de
  que a projeção é uma projeção, não um cálculo novo (lib/lexicon.js).
  10 é o menor intervalo que a densidade NÃO consegue produzir, porque ela é
  limitada a 9 exatamente para só desempatar. Então "margem >= 10" é a
  tradução exata da noção do `triage` — vencer o segundo colocado, não
  apenas liderar — para esta escala. `CONFIDENT_MARGIN` mora em
  `lib/lexicon.js`, ao lado do teto de densidade de que ele deriva, e o teste
  fixa a PROPRIEDADE (duas specs que casaram o mesmo termo nunca são
  confiantes, em nenhum tamanho) e não o número.
- **Isso precisa de ADR?** Não. A CLI continua sem interpretar linguagem: o
  ranking é o mesmo casamento determinístico de termos de sempre, e o arquivo
  que ele escreve é um esqueleto marcado como palpite, com o comando que o
  apaga — uma dica, nunca uma decisão (ADR 0005). O que mudou é o CUSTO de a
  dica estar errada, e a mudança o reduz: um arquivo errado e visível contra
  um arquivo ausente e silencioso.
