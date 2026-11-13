# Change 0260-requisitos-condicionais-na-secao-certa — requisitos condicionais na secao certa

- **Status:** applied
- **Applied:** 2026-11-13
- **Date:** 2026-11-13
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain; signals: shall, spec)
- **Affects specs:** scaffolding, templates
- **Documented surface:** n/a — two requirements move between sections of their specs with the same wording; no command, flag or output changes, so the docs that describe `init --preset`, `upgrade --preset` and `surface` stay true


## Why

O validate avisava em toda execução que dois requisitos da seção Optional usam shall e não may. Os dois vieram das changes 0251 e 0253 e não são opcionais: descrevem o que o sistema faz quando uma flag é passada (`--preset`) ou enquanto uma configuração está declarada (`surface: core`). Um aviso que aparece sempre ensina a ignorar avisos, e a release 0.22.0 não deve sair com eles.

## What

- Spec scaffolding: o requisito de `--preset` sai de Optional e entra em Event-driven ("When `doctrina init` or `doctrina upgrade` runs with `--preset <dir>`…"), com o mesmo conteúdo.
- Spec templates: o requisito de `surface: core` sai de Optional e entra em State-driven ("While `.doctrina/config.json` declares `"surface": "core"`…"), com o mesmo conteúdo.
- `doctrina validate` fica sem avisos.

## Scope boundaries

Nenhum comportamento muda e nenhum código é tocado: os critérios de aceite que provam os dois requisitos continuam os mesmos. A seção Optional da spec scaffolding fica vazia.

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

<!-- doctrina:applied-deltas specs/scaffolding/delta.md=108eb58b,18bc298a,e7c38c12 specs/templates/delta.md=54d70978,c9c38bb5,e7c38c12 -->
