# Change 0206-spec-tambem-encolhe — spec tambem encolhe

- **Status:** applied
- **Applied:** 2026-10-25
- **Date:** 2026-10-25
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain; signals: spec)
- **Affects specs:** authoring, templates, validation


## Why

A review de campo da 0.17: "specs viram listas que só crescem" e "um
comando para consolidar uma spec de tempos em tempos". Nenhum verbo de op
tirava algo — só acrescentavam ou substituíam —, então um requisito
superado ficava ao lado do sucessor para sempre. Neste repositório a spec
`gates` tem 369 linhas e 134 requisitos. Na auditoria: `replace-criterion`
substituía só a PRIMEIRA linha de um critério quebrado em duas ou mais linhas, deixando o
rabo da prova antiga sob a nova — o bug que o `replace-requirement` já tinha
corrigido.

## What

- Ops `remove-requirement <section> <n>[: <why>]` e `remove-criterion
  <n>[: <why>]` (os critérios seguintes são renumerados), pegando o item
  inteiro; `replace-criterion` passa a substituir o item inteiro.
- `work --consolidate <cap>`: change fixada na capability, delta MODIFIED,
  forma medida da spec (`specShape`) e playbook
  `playbooks/consolidate.md.template`.
- O aviso de 400 linhas do `validate` cita o comando.
- Help de `change`/`work`, template do delta, README do npm, docs EN/PT,
  CHANGELOG.
- Teste `uma-spec-tambem-encolhe.test.js`.

## Scope boundaries

- O CLI mede e aplica; decidir o que é redundante é do agente (ADR 0005).
- Nenhuma spec deste repositório é consolidada nesta change.

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
