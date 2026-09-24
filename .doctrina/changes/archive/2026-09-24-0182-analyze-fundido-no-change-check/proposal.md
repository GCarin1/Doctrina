# Change 0182-analyze-fundido-no-change-check — analyze fundido no change check

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:** Doctrina maintainers
- **Lane:** product (confident; signals: change, deve)
- **Affects specs:** gates


## Why

`doctrina change check <id>` já roda, como primeira seção, exatamente as
checagens estruturais que `doctrina analyze <id>` imprime, e depois o
dry-run dos blocos `ops` e a prévia do gate de arquivamento. Eram dois
comandos respondendo a mesma pergunta; o `close` também já roda o analyze
como primeiro passo. Pela ADR 0026, a redundância demonstrada por teste
autoriza a depreciação.

## What

- `analyze` entra em `DEPRECATED` (desde 0.17.0) apontando para
  `doctrina change check`, com a diferença de exit code declarada.
- `next` recomenda `change check <id>` e depois `close <id>`; o rerun do
  passo estrutural do close e dos gates structure/integrity nomeia
  `change check`.
- README, flow, migration, benchmarks, cli-reference (EN/PT), README do
  pacote, templates de playbook/contract e o bloco de superfície do
  AGENTS.md deixam de ensinar `analyze`.
- Spec `gates`: dois requisitos de evento e um critério verificado.

## Scope boundaries

- O `close` continua executando o mesmo passo estrutural por dentro (o id
  do passo segue `analyze`); só o comando de rerun muda.
- `change apply` mantém seu gate pré-apply intacto.
- `triage` não é fundido (ADR 0024 teria de ser superseded).

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

