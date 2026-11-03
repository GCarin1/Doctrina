# Change 0225-cortar-a-0-20-0 — cortar a 0.20.0

- **Status:** applied
- **Applied:** 2026-11-03
- **Date:** 2026-11-03
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain) — opened as chore
- **Affects specs:** n/a — chore

- **Documented surface:** n/a — release stamps and guides; the commands this release ships were documented by changes 0220–0224


## Why

A 0.20.0 fecha o plano pedido pelo operador: trabalho entre repositórios, com um orquestrador que planeja e delega, contexto versionado mesmo para repositórios que não podem carregar `.doctrina/`, ferramentas MCP declaradas e guardadas, e o registro da subida e da observabilidade. Faltava o manual de operação que junta tudo isso, e as docs de multiagente e brownfield ainda descreviam o ADR 0004 e o `work --from-diff` como as únicas portas.

## What

- Novo guia `docs/en/workspace.md` e `docs/pt/workspace.md` (no sidebar): workspace, absorção, ferramentas, arquivos do orquestrador, o ciclo da entrega e o que fica com o humano.
- `docs/{en,pt}/multi-agent.md`: seção "Planejador e executores (ADR 0030)", linhas novas na tabela de casos e o ADR 0030 no lugar do 0004.
- `docs/{en,pt}/brownfield.md`: "Regra 0 — Absorva uma vez, a partir do código" com `intake --from-code`.
- Corte da 0.20.0: CHANGELOG com "Upgrading from 0.19", versão no package.json, lockfile e READMEs, os cinco bullets do agente para a 0.20.0 (AGENTS.md regenerado) e os exemplos recarimbados.

## Scope boundaries

- Nenhum comportamento muda nesta change.

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
