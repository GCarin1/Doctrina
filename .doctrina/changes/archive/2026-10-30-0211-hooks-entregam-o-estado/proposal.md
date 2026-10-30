# Change 0211-hooks-entregam-o-estado — hooks entregam o estado

- **Status:** applied
- **Applied:** 2026-10-30
- **Date:** 2026-10-30
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** scaffolding, insight, templates


## Why

Review de campo (agente no Cursor): "sem o nome do framework no pedido, o
pedido de código ganha". O AGENTS.md é injetado, mas o ciclo é prosa lida uma
vez contra o pedido lido agora, e nenhum adaptador instalava os hooks que os
agentes oferecem para entregar estado: o Claude Code aceita contexto no
`SessionStart` e no `UserPromptSubmit`; o Cursor, no `sessionStart`
(`additional_context`).

## What

- Templates `.claude/settings.json` (SessionStart → `prime --hook claude`;
  UserPromptSubmit → `prime --pulse`) e `.cursor/hooks.json` (sessionStart →
  `prime --hook cursor`).
- `adapter add`/`remove` e `init` MESCLAM arquivos `.json` compartilhados
  (`mergeJson`/`unmergeJson` em lib/adapters.js).
- `prime --pulse` (uma linha factual) e `prime --hook claude|cursor`.
- Um template JSON não carrega `{{TOKEN}}` (o critério 2 de `templates` passa
  a dizer isso); um arquivo de settings sem nenhuma entrada do Doctrina não é
  tocado pelo `adapter remove`.
- Teste `o-agente-recebe-o-estado-a-cada-prompt.test.js`; docs EN/PT;
  CHANGELOG.

## Scope boundaries

- O hook por prompt do Cursor não injeta contexto (documentado); a regra
  sempre aplicada é a change seguinte.
- Os hooks assumem `doctrina` no PATH, como os slash commands.

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
