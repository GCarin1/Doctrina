# Change 0222-a-entrega-atravessa-repositorios — a entrega atravessa repositorios

- **Status:** applied
- **Applied:** 2026-11-03
- **Date:** 2026-11-03
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** delivery, templates

- **Documented surface:** `doctrina delivery new`, `doctrina delivery route`, `doctrina delivery list`, `doctrina delivery status`, `doctrina delivery check`, `doctrina delivery close`, `doctrina change card`, `doctrina work --delivery` — documented in `docs/en/cli-reference.md` and `docs/pt/cli-reference.md`


## Why

Uma tela nova mexe no `back-end`, no `front-core` e no `front-feature`. O operador quer conversar com UM orquestrador que lê a história, decide que repositórios mudam, abre o trabalho em cada um, delega as tarefas para agentes menores e só fecha quando tudo subiu. O ADR 0004 proibia escritores além do orquestrador, e nada no Doctrina representava um trabalho que cruza repositórios nem uma tarefa entregável a outro agente sem a conversa.

## What

- ADR 0030 substitui o 0004: um planejador roteia, escreve os cartões, revisa e fecha; executores recebem um cartão por vez; um escritor por repositório.
- `doctrina delivery new|route|list|status|check|close` (`src/commands/delivery.js`, `src/lib/delivery.js`), com `delivery.md.template` e o playbook `delivery`.
- `doctrina work --delivery <id>` grava `- **Delivery:** <id>` na proposal, e recusa entrega desconhecida (2) ou não roteada (3) antes de criar algo.
- `doctrina change card <id> [<n>]` (`src/lib/task-card.js`): a tarefa com as linhas `Files:`/`Requirement:`/`Verify:`, o Why, a spec recortada e o comando de tick.
- Nova spec `delivery`; spec `templates` registra os tokens novos.

## Scope boundaries

- O CLI não chama rastreador, wiki, design nem modelo: o playbook diz o que ler e o agente lê.
- Release e observabilidade entram no gate da entrega na change seguinte; aqui só as seções existem.
- Registro de ferramentas e agentes gerados ficam para a change seguinte.

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
