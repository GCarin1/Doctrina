# Change 0226-o-fluxo-da-entrega-nao-tem-furos — o fluxo da entrega nao tem furos

- **Status:** applied
- **Applied:** 2026-11-04
- **Date:** 2026-11-04
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain; signals: change)
- **Affects specs:** delivery

- **Documented surface:** `doctrina delivery tick`, `doctrina delivery route --force`, `doctrina delivery status`, `doctrina work --resume --delivery`, `doctrina prime` — documented in `docs/en/cli-reference.md` and `docs/pt/cli-reference.md`


## Why

O operador pediu uma auditoria do fluxo da entrega e a correção de cada furo encontrado. Percorrendo o fluxo passo a passo apareceram seis lugares em que o planejador saía do CLI ou errava em silêncio:

1. as caixas de `## Release` só se marcavam editando o arquivo à mão, embora o `delivery check` as cobre;
2. o `route` aceitava um projeto `pending`, sem spec, e a change aberta lá não teria o que mudar;
3. o playbook mandava rodar `doctrina change card` a partir do workspace, onde não há `.doctrina/` e o comando falha;
4. uma sessão aberta dentro do repositório (a do executor, ou a de uma pessoa) não via que a change aberta pertence a uma entrega;
5. uma change aberta sem `--delivery` não tinha como entrar numa entrega, a não ser editando o cabeçalho à mão;
6. duas entregas abertas no mesmo repositório punham dois escritores nele ao mesmo tempo, sem aviso.

## What

- `doctrina delivery tick <id> [<n>...|--all]` (`releaseBoxes`, `tickRelease` em `src/lib/delivery.js`).
- `delivery new --projects` e `delivery route` recusam (saída 3) projeto `pending` ou `missing`, citando `intake --from-code` ou `workspace attach`; `--force` roteia mesmo assim (`unroutable`).
- `delivery status` imprime `next card: cd <repo> && doctrina change card <id>` e nomeia o segundo escritor (`otherWriters`); o playbook da entrega e o hub gerado do workspace dizem o mesmo.
- `openChanges` carrega a entrega; `prime` e o pulse a nomeiam.
- `doctrina work --resume <change> --delivery <id>` grava o cabeçalho, e recusa (3) uma change que já é de outra entrega.
- Delta da spec `delivery`, docs EN/PT, contadores e CHANGELOG.

## Scope boundaries

- O fluxo continua o mesmo; nada aqui decide pelo planejador. O guia do fluxo genérico e a auditoria da documentação são a change seguinte.

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
