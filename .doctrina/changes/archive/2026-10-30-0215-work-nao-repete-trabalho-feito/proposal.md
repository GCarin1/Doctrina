# Change 0215-work-nao-repete-trabalho-feito — work nao repete trabalho feito

- **Status:** applied
- **Applied:** 2026-10-30
- **Date:** 2026-10-30
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** authoring


## Why

Review de campo: as changes 0077 e 0078 foram implementadas e arquivadas, e o
pedido seguinte foi "crie os devidos doctrina work" para elas. Uma change
arquivada fica fora de toda leitura padrão; nada impedia o `work` de abrir o
mesmo trabalho duas vezes.

## What

- `similarChanges` (lib/work-model.js): changes abertas e arquivadas nos
  últimos 14 dias cujo título/Why o pedido repete em boa parte (mínimo 3
  termos e 60% de cobertura de um dos lados, cada lado com os próprios
  termos).
- `work` segura o pedido com saída 3, nomeando a change: retomar
  (`--resume`) ou relatar como feita no caminho do arquivo; `--force` abre
  mesmo assim.
- Teste `o-work-nao-repete-trabalho-feito.test.js`; help, docs EN/PT;
  CHANGELOG.

## Scope boundaries

- `--from-diff` e `--consolidate` não passam pela checagem.
- A primeira versão da cobertura casou esta própria change com a 0214 por
  uma palavra do Why; corrigido antes do close.

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
