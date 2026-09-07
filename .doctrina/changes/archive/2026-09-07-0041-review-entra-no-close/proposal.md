# Change 0041-review-entra-no-close — review entra no close

- **Status:** applied
- **Applied:** 2026-09-07
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** gates

## Why

review faz a analise de conformidade mais rica do projeto e nenhum driver o invoca, entao ela so acontece se alguem digitar o comando; incluir review como passo consultivo do close antes do apply

## What

`doctrina review` entra na sequência de `close.js` como passo consultivo, antes do
`apply` — que é onde as suas conclusões ainda podem mudar o resultado.

- Consultivo nesta change: reporta, nunca bloqueia.
- Escopado ao diff da change em fechamento, não à árvore inteira.
- `review --strict` continua sendo a porta do CI para quem quiser bloquear.
- Delta em `specs/gates`.

Achado F3 da auditoria. `review` faz a análise de conformidade mais rica do projeto —
capacidades tocadas pelo diff cujas specs não mudaram, dependentes afetados, coverage
danglando — e nenhum driver o invoca, então ela só acontece se alguém digitar o comando.

## Scope boundaries

- Não promove `review` a bloqueante: ele emite um break para toda capacidade com código tocado e spec parada, e o ruído precisa ser medido antes.
- Não muda as verificações que o `review` faz.
- A change 0034 aterrissou antes, então o passo entra na declaração de sequências (`SEQUENCES.close`), não num array literal.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] `close` executa `review` antes do `apply` e reporta os achados sem bloquear.
- [x] Uma change que altera código sem tocar a spec correspondente aparece no relatório do close.
- [x] Um `review` que falha não altera o código de saída do close.

## Open questions

- Resolvida quanto ao MECANISMO, deliberadamente em aberto quanto ao número:
  a base é o ledger (quantas changes fecharam com breaks de review em aberto) e
  o log de uso da change 0050. Fixar um número agora — "dez changes" — seria
  inventar o dado que a decisão precisa. O critério é qualitativo e verificável:
  promover a bloqueante quando a proporção de breaks legítimos (um refactor que
  não muda comportamento e não deveria editar spec) for pequena o bastante para
  que recusar não ensine ninguém a ignorar o gate. Até lá, `review --strict` é a
  porta de quem quiser bloquear no CI hoje.
