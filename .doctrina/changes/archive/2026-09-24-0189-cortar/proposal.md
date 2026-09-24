# Change 0189-cortar — cortar a 0.17.0

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:** Doctrina maintainers
- **Lane:** chore — opened as chore
- **Affects specs:** (none — chore)

- **Documented surface:** n/a — carimbo de versão e changelog; os comandos citados já foram documentados pelas changes que os mudaram


## Why

cortar a versão 0.17.0: a rodada 0121–0190 fundiu comandos (analyze,
report, skill sync, templates check|update), removeu constitution e
change diff e corrigiu o fluxo e a documentação; nada disso chega a quem
instala pelo npm até a versão sair.

## What

Corta a 0.17.0:

- `CHANGELOG.md`: o `## [Unreleased]` vira `## [0.17.0] — 2026-09-24`,
  com uma seção por tipo na ordem do Keep a Changelog (havia dois
  `### Added`) e uma nota "Upgrading from 0.16"; fica um Unreleased vazio.
- `package.json`, `package-lock.json`, os dois READMEs e o README do
  pacote carimbam 0.17.0.
- `AGENT_CHANGELOG["0.17.0"]`: quatro bullets sobre o que um agente passa
  a fazer; `upgrade --write` regenerou o bloco "What changed" do
  AGENTS.md e re-carimbou o índice.
- Os índices dos dois exemplos re-carimbados (`index rebuild`), que o CI
  valida com `--strict`.

## Scope boundaries

- Nada de tag, publicação no npm ou merge em `main`: o release é
  disparado pela tag `v0.17.0`, que fica para quem publica.

## Verification

<!--
How you will know the change is correctly applied. Use checkboxes: every
box here is a claim that must be PROVEN before the change is done.
`doctrina change archive` refuses to archive while any box below is
unchecked (pass --force to archive anyway and record the gap). Distinguish
"task marked done" from "verification passed" — link the evidence.
-->

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

