# Change 0197-0-17-0-inclui-0191-a-0196 — 0.17.0 inclui 0191 a 0196

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:** Doctrina maintainers
- **Lane:** chore — opened as chore
- **Affects specs:** (none — chore)

- **Documented surface:** n/a — só o CHANGELOG e o bloco "What changed"; cada comando citado foi documentado pela change que o mudou


## Why

A 0.17.0 foi datada na 0189, mas ainda não tem tag nem publicação. As
changes 0191 a 0196, da auditoria seguinte, entraram num `[Unreleased]`
novo, entre elas a 0196, que impede um id de change em forma de caminho
de mover diretórios de fora de `.doctrina/changes/`. Sem incluí-las, a
tag sairia sem essas correções.

## What

- As entradas do `[Unreleased]` passam para a seção `### Fixed` da
  `[0.17.0]`; o `[Unreleased]` fica vazio.
- `AGENT_CHANGELOG["0.17.0"]` ganha o quinto bullet (tasks.md sem
  Closing steps, `intake --converted` com gate, referência de change é
  nome de pasta); `upgrade --write` regenerou o bloco do AGENTS.md.

## Scope boundaries

- A data da seção continua 2026-09-24; tag e publicação ficam para quem
  publica.

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

