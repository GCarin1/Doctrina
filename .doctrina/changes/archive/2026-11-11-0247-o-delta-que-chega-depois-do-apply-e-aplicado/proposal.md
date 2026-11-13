# Change 0247-o-delta-que-chega-depois-do-apply-e-aplicado — o delta que chega depois do apply e aplicado

- **Status:** applied
- **Applied:** 2026-11-11
- **Date:** 2026-11-11
- **Owner:** Doctrina maintainers
- **Lane:** runtime (uncertain; signals: em silencio) — opened anyway (--force)
- **Affects specs:** authoring


## Why

Ao fechar a change 0246 neste repositório, o close aplicou (a change ainda não tinha delta), parou num teste que falhava, e o conserto era um delta. O close seguinte respondeu "already applied — nothing to do" e seguiu adiante. Por acaso o teste que falhava era justamente o que dependia do delta; com qualquer outra falha a change teria sido arquivada dizendo que modificou uma spec que nunca tocou. O carimbo `applied` é da change inteira, e uma change não está terminada quando é carimbada. Reproduzido num projeto limpo: o requisito do delta tardio não chegava à spec.

## What

- `lib/applied-deltas.js`: o `apply` grava na última linha do `proposal.md` um comentário com cada delta aplicado e a impressão de cada op.
- Numa change já aplicada, o `apply` aplica só os deltas e as ops que o registro não nomeia, uma vez, e diz quais; uma op registrada que mudou ou sumiu para o apply com saída 1.
- Sem registro (change aplicada por CLI anterior) o comportamento é o de antes.
- Docs EN/PT do `change apply`, CHANGELOG.
- `scripts/check-docs.js`: uma cerca de código abre e fecha no início de uma linha; três crases dentro de uma frase eram lidas como abertura de bloco, e a prosa até a próxima cerca virava "saída de CLI sem marcador".

## Scope boundaries

O `--force` continua aplicando tudo de novo. Deltas MODIFIED sem bloco de ops (merge manual) e ADDED/REMOVED têm uma impressão do texto inteiro: editados depois do apply, param o apply.

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

<!-- doctrina:applied-deltas specs/authoring/delta.md=b9a519df,27bf70c6,c8d2f439,d90b5a5b -->
