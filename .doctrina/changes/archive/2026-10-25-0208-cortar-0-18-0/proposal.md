# Change 0208-cortar-0-18-0 — cortar a 0.18.0

- **Status:** applied
- **Applied:** 2026-10-25
- **Date:** 2026-10-25
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain) — opened as chore
- **Affects specs:** (none — chore)

- **Documented surface:** n/a — corta a versão: CHANGELOG, carimbos de versão e o bloco do AGENTS.md regenerado; os comandos já foram documentados nas changes 0199 a 0207


## Why

Cortar a 0.18.0 com as changes 0199 a 0207, nascidas de uma review de campo
da 0.17 (85 changes num projeto que adota o Doctrina) e da auditoria que a
precedeu.

## What

- CHANGELOG: `## [Unreleased]` vira `## [0.18.0] — 2026-10-25`, com o
  contexto e a nota "Upgrading from 0.17".
- package.json, lockfile, READMEs e o README do pacote carimbam 0.18.0.
- `AGENT_CHANGELOG` ganha os cinco bullets da 0.18.0; `upgrade --write`
  regenerou o bloco "What changed" do AGENTS.md e o carimbo do índice; os
  índices dos exemplos foram re-carimbados.
- Conferidos `npm pack --dry-run` (o playbook de consolidação vai no
  pacote) e o harness de instalação empacotada (45 checks).

## Scope boundaries

- A tag `v0.18.0` e a publicação no npm ficam para depois do merge na main.

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

Nenhuma.
