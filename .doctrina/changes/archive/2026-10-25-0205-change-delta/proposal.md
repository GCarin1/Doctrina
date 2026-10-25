# Change 0205-change-delta — change delta

- **Status:** applied
- **Applied:** 2026-10-25
- **Date:** 2026-10-25
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain; signals: change)
- **Affects specs:** authoring, gates


## Why

A review de campo da 0.17 pediu "um comando `doctrina delta add` para
acrescentar requisito e critério sem escrever os blocos ops à mão". Hoje o
agente escreve as linhas do bloco `ops` de cabeça, e um erro (seção
inexistente, número de requisito que não existe) só aparece no `change
check` ou no close.

## What

- `change delta <id> <capability>` (subcomando de `change`, sem linha nova
  na superfície do AGENTS.md): `--requirement`, `--criterion`, `--bump`,
  `--op` ou a linha de op depois da capability.
- `parseOp`/`insertOps` em lib/spec-ops.js, `addDeltaOps` em
  lib/change-ops.js: mesma gramática do `apply` (ADR 0021), dry-run do bloco
  inteiro contra a spec antes de escrever, bump substituído em vez de
  duplicado, delta criado do template quando falta.
- Playbook do `work`, help, docs EN/PT (cli-reference e flow), CHANGELOG;
  bloco de superfície do AGENTS.md regenerado.
- Corrige a requisição optional da change 0204, que usava `shall` onde o
  EARS pede `may` (escrita com o próprio `change delta`).
- Teste `o-change-delta-escreve-as-ops.test.js`.

## Scope boundaries

- Não acrescenta verbos de op; remoção é a change seguinte.
- Não toca deltas ADDED ou REMOVED (saída 3).

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
