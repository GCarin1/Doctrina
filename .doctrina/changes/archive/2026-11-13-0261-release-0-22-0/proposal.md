# Change 0261-release-0-22-0 — release 0.22.0

- **Status:** applied
- **Applied:** 2026-11-13
- **Date:** 2026-11-13
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain) — opened as chore
- **Affects specs:** none


## Why

O que entrou desde a 0.21.0 (changes 0242 a 0260) está fechado no branch e em lugar nenhum para quem instala pelo npm: o console com rosto, qualquer agente e modelo, consoles que conversam entre terminais, testes de propriedade a partir do EARS, presets de organização, trilhas por tamanho, onboarding guiado, merge de índice entre branches, adapter do Kiro e as correções de três auditorias. A 0.22.0 é a versão que leva isso ao npm.

## What

- `packages/doctrina-cli/package.json` e o lockfile em 0.22.0; `CHANGELOG.md` com o conteúdo de Unreleased sob `## [0.22.0] — 2026-11-13` e uma seção "Upgrading from 0.21".
- `AGENT_CHANGELOG["0.22.0"]` com as cinco linhas que um agente precisa saber, e o bloco "What changed in 0.22.0" do `AGENTS.md` regenerado.
- Status dos três READMEs, a minor suportada no `SECURITY.md` e o `framework_version` do índice raiz e de cada exemplo carimbados em 0.22.0 por `scripts/release.mjs`.
- `npm pack --dry-run`: o tarball leva só `src/`, `templates/`, `README.md` e `package.json`.

## Scope boundaries

Esta change não publica nem cria tag: o workflow Release publica e marca `v0.22.0` quando a mudança de versão chega em `main` pelo pull request. Nenhum comportamento muda aqui.

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

<!-- doctrina:applied-deltas none -->
