# Change 0199-source-de-diretorio — source de diretorio

- **Status:** applied
- **Applied:** 2026-10-25
- **Date:** 2026-10-25
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** gates


## Why

Numa auditoria simulando um projeto que adota o Doctrina, três specs declararam
`**Source:** \`src/health/\`` — o jeito natural de dizer "este módulo é meu" — e
o `validate` respondeu que o padrão não casava com arquivo nenhum. O glob
compilava o caminho literal `src/health/`, que nenhum arquivo tem: a
declaração não reivindicava nada e o `review` tratava cada arquivo do módulo
como sem dono.

## What

- `globToRegExp` (lib/runtime.js) lê um padrão terminado em `/` como
  `<dir>/**`.
- Teste `um-source-de-diretorio-reivindica-o-diretorio.test.js`.
- cli-reference EN/PT documenta a forma; CHANGELOG.

## Scope boundaries

- O dialeto não muda em mais nada: `*`, `**`, `?` e `{a,b}` seguem iguais, e
  `src/health` sem barra continua sendo o caminho exato.

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
