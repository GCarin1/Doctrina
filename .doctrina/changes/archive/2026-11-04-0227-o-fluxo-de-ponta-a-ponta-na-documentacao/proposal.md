# Change 0227-o-fluxo-de-ponta-a-ponta-na-documentacao — o fluxo de ponta a ponta na documentacao

- **Status:** applied
- **Applied:** 2026-11-04
- **Date:** 2026-11-04
- **Owner:** Doctrina maintainers
- **Lane:** product (confident; signals: documentar) — opened as chore
- **Affects specs:** (none — chore)

- **Documented surface:** n/a — documentation only; it describes existing commands and changes none


## Why

A 0.20.0 entregou o workspace, a entrega, os cartões e a guarda, mas a documentação não tinha o fluxo comum de ponta a ponta: quem faz o quê, passo a passo, sem amarrar a uma ferramenta, a um MCP ou a uma stack. A auditoria também achou texto que ainda apresentava o ADR 0004 (orquestrador único e linear) como regra, embora o ADR 0030 o tenha substituído, um diagrama de fluxo sem o momento de orquestração, um glossário sem os termos novos e o PT atrás do EN no tópico de constitution.

## What

- Novo guia `docs/en/end-to-end-flow.md` e tradução `docs/pt/end-to-end-flow.md`: papéis, diagrama, Fase 0 (preparação), Fase 1 (um item de trabalho em 11 passos, com o que segura cada um), onde o analista decide, o que cada time escolhe e quando o fluxo se desvia.
- Links para o guia na barra lateral, nos READMEs, no getting-started, no workflow e no workspace.
- Texto do ADR 0004 trocado pelo ADR 0030 nos READMEs, workflow, antipatterns, glossary, migration e comparison (EN e PT).
- `flow.md` ganha o subgrafo Orquestrar; o glossário ganha Delivery, Executor, Guarda, Planejador, Projeto sombra, Cartão de tarefa e Workspace.
- PT de deferred e comparison alcança o EN no tópico de constitution.

## Scope boundaries

Nenhum código e nenhuma spec mudam. O `multi-agent.md` já descreve o ADR 0030 e fica como está.

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
