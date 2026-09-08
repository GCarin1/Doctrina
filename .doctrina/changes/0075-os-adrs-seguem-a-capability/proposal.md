# Change 0075-os-adrs-seguem-a-capability — os adrs seguem a capability

- **Status:** proposed
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain; signals: change)
- **Affects specs:** authoring

## Why

a change 0054 criou a capability authoring mas nenhum ADR foi reescopado para ela: so o 0026 a nomeia, e os ADRs que de fato a governam - 0005 playbooks executados pelo agente para intake e work, 0007 deltas estruturados - continuam dizendo cli, entao o pacote de authoring so os recebe por heranca de dependencia e sao justamente os primeiros que o fitter descarta sob pressao

## What

A change 0054 dividiu a spec `cli` em `cli` + `authoring`. A capability nasceu,
os ADRs não a acompanharam: hoje **um** ADR nomeia `authoring` no `Scope:` — o
0026 — enquanto os que de fato a governam continuam apontando para `cli`.

- ADR 0005 (playbooks executados pelo agente para `intake` e `work`) — `cli, docs, gates`.
- ADR 0007 (deltas de spec estruturados, os verbos `ops`) — `cli, core`.
- ADR 0019 / 0020 (resolução de template, a superfície de comandos) — `cli, templates`.

A consequência é mensurável e não é estética. O pacote de `authoring` só recebe
esses ADRs por herança de dependência, e herança é o primeiro tier que o fitter
descarta. Com o backlog desta auditoria aberto, o pacote omite nove ADRs — entre
eles o 0005 e o 0007, que são exatamente os que um agente precisa para mexer em
`work` e em `intake`.

**Esta change é drenada primeiro, fora da ordem de id.** Não por importância: é a
única do backlog que torna a leitura de todas as outras mais barata, e duas das
outras (0070 e 0071) trabalham justamente em `authoring`. A ordem por id é um
padrão bom; este é o caso em que ele não serve, e o motivo fica escrito aqui.

## Scope boundaries

- Não cria nem remove ADR nenhum, e não altera o corpo de nenhum: `Scope:` é
  metadado de leitura, não a decisão (os ADRs seguem imutáveis).
- Não mexe no orçamento de contexto nem no algoritmo do fitter — o problema é o
  escopo estar errado, não o teto estar baixo.
- Não reescopa ADR que já esteja certo só para arredondar o resultado.

## Verification

<!--
How you will know the change is correctly applied. Use checkboxes: every
box here is a claim that must be PROVEN before the change is done.
`doctrina change archive` refuses to archive while any box below is
unchecked (pass --force to archive anyway and record the gap). Distinguish
"task marked done" from "verification passed" — link the evidence.
-->

- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

- Nenhuma.
- [ ] Todo ADR que governa `intake`, `work`, `spec`, `change`, `decision`, `contract`, `skill`, `intent` ou `triage` nomeia `authoring`.
- [ ] O pacote de `authoring` deixa de omitir os ADRs que decidem o comportamento dessas operações.
- [ ] Um teste liga o escopo dos ADRs às operações que a spec `authoring` declara, para que a próxima divisão de spec não repita o esquecimento.
