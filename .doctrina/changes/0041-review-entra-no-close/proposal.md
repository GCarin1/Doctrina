# Change 0041-review-entra-no-close — review entra no close

- **Status:** proposed
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
- Depende da declaração de sequências da change 0034 se ela aterrissar antes; caso contrário entra no array literal.

## Verification

- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [ ] `close` executa `review` antes do `apply` e reporta os achados sem bloquear.
- [ ] Uma change que altera código sem tocar a spec correspondente aparece no relatório do close.
- [ ] Um `review` que falha não altera o código de saída do close.

## Open questions

- Medir o ruído em quantas changes antes de considerar promover a bloqueante? O log de uso e o ledger dariam a base.
