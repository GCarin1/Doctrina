# Change 0046-o-ledger-vira-fonte-legivel — o ledger vira fonte legivel

- **Status:** proposed
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** gates

## Why

o LEDGER.md e um log estruturado de data, id, titulo e specs afetadas lido por apenas dois consumidores enquanto metrics deriva tudo do git que nao sabe nada de capacidades; escrever um parser e ligar o ledger ao report, ao review e ao escopo por dependentes

## What

O `LEDGER.md` deixa de ser um arquivo que só duas coisas leem. Cada linha carrega data,
id, título e specs afetadas com a operação — um log de eventos de domínio que hoje só
`decision scope` e um cross-check do `validate` consomem.

- Novo `src/lib/ledger.js`: parser tolerante a linhas livres (o contrato é que o CLI só faz append; humanos editam).
- `report` ganha churn por capacidade no período.
- `review` usa o churn como sinal ("esta spec mudou 9× em 60 dias").
- `close` amplia o escopo do coverage para os dependentes diretos da capacidade tocada, no nível consultivo.
- Delta em `specs/gates`.

Achados F13 e F14 da auditoria.

## Scope boundaries

- O CLI continua apenas fazendo append no ledger; o parser nunca reescreve.
- O escopo por dependentes entra como consultivo: alargar o gate reintroduz o problema que o escopo resolveu.
- `metrics` continua derivando do git nesta change; unificar as duas fontes é a change 0050.

## Verification

- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [ ] O parser lê o ledger deste repositório inteiro sem erro, incluindo as linhas de abandono e de docs gap.
- [ ] Uma linha editada à mão fora do formato é ignorada, não derruba o parser.
- [ ] `report` mostra o churn por capacidade e `close` lista os dependentes como aviso.

## Open questions

- O churn é sinal de risco ou de saúde? Uma spec que muda muito pode estar mal desenhada ou apenas ser a mais ativa — o `review` deve reportar o número sem julgá-lo?
