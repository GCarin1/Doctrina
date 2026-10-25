# Change 0204-verify-afetado — verify afetado

- **Status:** applied
- **Applied:** 2026-10-25
- **Date:** 2026-10-25
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** gates


## Why

A review de campo da 0.17 pediu "verificação incremental: só os projetos
afetados durante o trabalho, a suíte inteira só no fechamento final". O
Doctrina não tem como saber a que projeto um arquivo pertence — então a
checagem diz, com o mesmo campo `paths` em que o sign-off de uma checagem
manual já expira.

## What

- `workingChanges` (lib/signoff.js): quais dos paths o trabalho não
  commitado toca (edições contra HEAD + não rastreados).
- `verify --affected`: uma checagem com `paths` só roda quando um deles foi
  tocado; sem `paths`, sempre roda; o resumo diz quais pulou; uma execução
  parcial nunca é lembrada para o `--reuse`.
- Help do verify mostra `paths` no exemplo; docs EN/PT; CHANGELOG.
- Teste `o-verify-afetado-roda-so-o-que-mudou.test.js`.

## Scope boundaries

- O close não muda: sempre roda todas as checagens (ou reaproveita uma
  execução toda verde, change 0203).
- `--affected` compara com o HEAD; não aceita um ref.

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
