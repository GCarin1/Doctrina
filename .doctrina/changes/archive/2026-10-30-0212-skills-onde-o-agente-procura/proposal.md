# Change 0212-skills-onde-o-agente-procura — skills onde o agente procura

- **Status:** applied
- **Applied:** 2026-10-30
- **Date:** 2026-10-30
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** skills


## Why

Review de campo (agente no Cursor): o catálogo de skills do editor lista
`~/.cursor/skills` e plugins, nunca `.doctrina/skills/`. As 16 skills do
projeto, cada uma com `when:`, só disparavam quando o pedido citava o arquivo.
Nesta própria sessão o catálogo do Claude Code listou os comandos `doctrina-*`
e nenhuma das 9 skills do repositório. Os agentes já compartilham um formato
(pasta com `SKILL.md`, `name` + `description`) que descobrem sozinhos:
`.agents/skills/` (Cursor, Codex) e `.claude/skills/` (Claude Code).

## What

- lib/skill-export.js: `renderSkillExport`, `planSkillExport`,
  `applySkillExport`; o `when:` entra na description.
- `index rebuild` exporta (sob `--check`, só uma nota); `upgrade --write` e
  `adapter add` também.
- Este repositório passa a carregar `.agents/skills/` e `.claude/skills/`
  gerados.
- Teste `as-skills-aparecem-para-o-agente.test.js`; docs EN/PT; CHANGELOG.

## Scope boundaries

- `.doctrina/skills/` continua a fonte; o formato da skill não muda.
- Uma pasta não gerada pelo Doctrina nunca é tocada.

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
