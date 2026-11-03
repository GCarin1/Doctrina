# Change 0219-cortar-0-19-0 — cortar a 0.19.0

- **Status:** applied
- **Applied:** 2026-10-30
- **Date:** 2026-10-30
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain) — opened as chore
- **Affects specs:** (none — chore)

- **Documented surface:** n/a — corta a versão: CHANGELOG, carimbos de versão e o bloco do AGENTS.md regenerado; os comandos foram documentados nas changes 0211 a 0218


## Why

Cortar a 0.19.0 com as changes 0211 a 0218, nascidas de uma review de campo
de um agente usando o Doctrina no Cursor (2026-10-30) e da auditoria que a
seguiu. A 0.18.0 foi mergeada mas ainda não tem tag; a 0.19.0 a inclui.

## What

- CHANGELOG: `## [Unreleased]` vira `## [0.19.0] — 2026-10-30`, com o
  contexto e a nota "Upgrading from 0.18".
- package.json, lockfile, READMEs e o README do pacote carimbam 0.19.0.
- `AGENT_CHANGELOG` ganha os cinco bullets da 0.19.0; `upgrade --write`
  regenerou o AGENTS.md (148 linhas) e o índice; índices dos exemplos
  re-carimbados.
- Conferidos `npm pack --dry-run` (os novos lib e templates vão no pacote)
  e o harness de instalação empacotada (45 checks).

## Scope boundaries

- A tag `v0.19.0` e a publicação no npm ficam para depois do merge.

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
