# Change 0050-metricas-e-uso-realimentam-o-fluxo — metricas e uso realimentam o fluxo

- **Status:** applied
- **Applied:** 2026-09-07
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

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] `metrics --trend` lê mais de dois snapshots e mostra a série.
- [x] `report` inclui as taxas do período.
- [x] `doctor` só menciona o log de uso quando ele existe, e nunca cria arquivo nenhum.
- [x] Um projeto sem `DOCTRINA_USAGE_LOG` tem comportamento inalterado.

## Open questions

- **Vale um gate de regressão? — Resolvido: não, e a própria formulação da
  pergunta diz por quê.** Seria o primeiro gate sobre um NÚMERO em vez de
  sobre uma estrutura, e é aí que ele quebra: todo gate do framework consegue
  dizer exatamente o que está errado e qual comando conserta (ADR 0008). "A
  taxa de revert subiu 3 pontos" não nomeia nem uma coisa nem outra. Pior, as
  duas taxas se movem com coisas que a CLI não enxerga — tamanho do time,
  cadência de release, o recorte da janela — e o proxy de re-edit conta
  trabalho iterativo legítimo exatamente como conta retrabalho (95,8% neste
  repositório agora, durante uma sequência de changes pequenas no mesmo
  conjunto de arquivos; um gate teria bloqueado todas). Um limiar seria
  arbitrário e o remédio previsível seria calibrá-lo até parar de incomodar,
  que é como um gate vira decoração. Então: `--trend` mostra a série, o
  `report` mostra as taxas do período, e ambos dizem na saída que aquilo é
  direção e não veredito. O protocolo de validação (`docs/*/validation.md`)
  continua sendo onde os números viram decisão — por uma pessoa.
- **E o log de uso, vira gate?** Também não, pela mesma família de razão e uma
  a mais: ele é opt-in, então um gate sobre ele puniria justamente quem
  aceitou ser medido. O `doctor` lista as operações nunca invocadas como
  CANDIDATAS; aposentar uma exige redundância demonstrada (ADR 0026).
