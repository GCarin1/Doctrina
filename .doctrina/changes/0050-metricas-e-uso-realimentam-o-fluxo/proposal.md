# Change 0050-metricas-e-uso-realimentam-o-fluxo — metricas e uso realimentam o fluxo

- **Status:** proposed
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** scaffolding

## Why

os snapshots de metricas viram um unico delta contra o anterior e morrem, e o log de uso construido para instrumentar a superficie so e lido por um comando que precisa ser digitado; ler a serie inteira e reportar as operacoes nunca invocadas no doctor

## What

Duas fontes de dado que o projeto já coleta passam a alimentar alguma decisão.

- `metrics --trend` lê a série inteira de `.doctrina/metrics/*.json`, em vez do delta contra o snapshot anterior.
- `report` passa a incluir taxa de revert e re-edit rate do período.
- `doctor` reporta as operações do catálogo nunca invocadas, quando o log de uso existe.
- Delta em `specs/scaffolding`.

Achados F15 e F16 da auditoria. Os snapshots são uma série temporal versionada no
repositório usada como se fosse um par de valores; e `lib/usage.js` foi construído
explicitamente para "instrumentar a superfície antes de encolhê-la", mas só é lido por
um comando que precisa ser digitado — então a decisão que o instrumento existe para
informar continua sendo tomada por opinião.

## Scope boundaries

- O log de uso continua opt-in, local, sem argumentos e sem rede: a discrição é a feature.
- Não cria gate de regressão sobre as métricas nesta change; só reporta.
- Não unifica as fontes de `metrics` (git) e `report` (índice e ledger): isso pertence à change 0046.

## Verification

- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [ ] `metrics --trend` lê mais de dois snapshots e mostra a série.
- [ ] `report` inclui as taxas do período.
- [ ] `doctor` só menciona o log de uso quando ele existe, e nunca cria arquivo nenhum.
- [ ] Um projeto sem `DOCTRINA_USAGE_LOG` tem comportamento inalterado.

## Open questions

- Vale um gate de regressão ("revert rate subiu N pontos")? Seria o primeiro gate do framework sobre um número em vez de sobre uma estrutura.
