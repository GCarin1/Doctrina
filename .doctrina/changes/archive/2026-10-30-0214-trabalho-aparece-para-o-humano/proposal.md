# Change 0214-trabalho-aparece-para-o-humano — trabalho aparece para o humano

- **Status:** applied
- **Applied:** 2026-10-30
- **Date:** 2026-10-30
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** insight, authoring, gates


## Why

Review de campo: "o `work` acontece no terminal, a pasta aberta vive pouco,
e o `close` move tudo para `changes/archive/`" — fora de toda leitura padrão.
Da cadeira de quem pede, a atividade parece feita sem Doctrina; o pedido
seguinte foi "crie os devidos doctrina work" para as changes 0077 e 0078, já
arquivadas.

## What

- `work` termina com `Tell the human: opened change <id> — "<title>"
  (.doctrina/changes/<id>/)`.
- `close` termina com `Tell the human: change <id> is closed — archived at
  <caminho>`.
- `prime` ganha "Recently closed" (últimos 7 dias, com caminho); o pulse
  nomeia a última fechada quando nenhuma está aberta (`recentlyClosed` em
  lib/snapshot.js).
- Fixtures dos playbooks; teste `o-trabalho-aparece-para-o-humano.test.js`;
  docs EN/PT; CHANGELOG.

## Scope boundaries

- O `--quiet` continua com uma linha só (é registro de backlog).

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
