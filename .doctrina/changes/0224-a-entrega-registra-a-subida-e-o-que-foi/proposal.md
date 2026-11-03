# Change 0224-a-entrega-registra-a-subida-e-o-que-foi — a entrega registra a subida e o que foi observado

- **Status:** applied
- **Applied:** 2026-11-03
- **Date:** 2026-11-03
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** delivery

- **Documented surface:** `doctrina delivery check`, `doctrina delivery list` — documented in `docs/en/cli-reference.md` and `docs/pt/cli-reference.md`


## Why

O operador quer que a entrega cubra subida, validação, monitoramento e observabilidade, e não só o código. Até aqui o `delivery check` passava assim que as changes estavam arquivadas: uma entrega fechava sem história, sem prova de que subiu e sem ninguém ter olhado os monitores depois. E nada media quanto tempo uma entrega leva.

A CI do PR #27 no Windows também achou dois pontos com CRLF: o cartão de tarefa perdia o Why da change e a entrega podia guardar o `\r` no título.

## What

- `src/lib/delivery.js`: `recordBlockers` — `## Story` vazio, caixa de `## Release` desmarcada e `## Observability` vazio entram nos bloqueios do `delivery check` e do `delivery close`; `sectionText` e `daysBetween`.
- `delivery status` mostra o que falta no registro; `delivery list` mostra a idade, o lead time e a mediana das fechadas.
- CRLF: `task-card.js` e `readDelivery` normalizam as quebras de linha; os testes normalizam o que leem antes de editar.
- Delta da spec `delivery`, docs EN/PT e CHANGELOG.

## Scope boundaries

- O Doctrina não roda o pipeline nem lê o monitor: o playbook diz o que registrar e o `doctrina-observer` lê com a ferramenta declarada.

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
