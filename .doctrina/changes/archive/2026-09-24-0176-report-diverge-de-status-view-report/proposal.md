# Change 0176-report-diverge-de-status-view-report — report diverge de status view report

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:**
- **Lane:** product
- **Affects specs:** insight


## Why

A ajuda do `report` dizia ser "a mesma visão que `status --view report`", e a do `status` prometia que suas visões "nunca podem mostrar números diferentes". Não era verdade: o `report` passava as métricas da janela para o renderizador e o `status --view report` não, então num repositório com histórico o sobrevivente imprimia duas linhas a menos (reverts e taxa de re-edit). O teste de identidade existente rodava sem histórico, o único lugar onde os dois concordavam.

Com a divergência corrigida, o `report` não faz nada que o `status` não faça: ele é o mesmo digest com outro nome. A política do catálogo (ADR 0026: obsolescência exige redundância demonstrada por teste) permite aposentá-lo. O único recurso exclusivo, `--agent-changelog`, precisa ir junto para o `status`.

## What

- `packages/doctrina-cli/src/lib/snapshot.js`: `collectReportWindow(projectRoot, days)`, um coletor só para a janela do digest (git, estado do histórico e métricas).
- `status.js`: usa o coletor; ganha `--view agent-changelog` (o rascunho que era `report --agent-changelog`) e documenta `rules`, que já existia.
- `report.js`: usa o mesmo coletor e fica obsoleto (`DEPRECATED` em `commands.js`, desde 0.17.0), apontando para `status --view report`. Continua funcionando, com aviso no stderr.
- Rodapé do digest, bloco de comandos do `AGENTS.md` e do template, skill `cut-a-release` e docs EN/PT (referência, workflow, validation, gating, flow) passam a nomear o sobrevivente.

## Scope boundaries

- O `report` não é removido: a remoção é uma change posterior, como foi com `constitution` e `change diff`.
- O `metrics` continua: tem `--save`, `--trend` e `--commands`, que o digest não faz.
- As menções em prosa ao `report` fora das seções que ensinam a rodar o comando ficam para a change 0179 (documentação defasada).

## Verification

- [x] `packages/doctrina-cli/test/o-digest-tem-um-nome-so.test.js` passa (3 testes, com histórico git) e falha 3/3 no código anterior.
- [x] Neste repositório, `report` e `status --view report` (padrão e `--since 30`) e as duas formas do changelog são idênticos byte a byte.
- [x] Automated checks pass (`doctrina verify`).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

Nenhuma.
