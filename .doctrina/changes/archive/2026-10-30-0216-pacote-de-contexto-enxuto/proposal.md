# Change 0216-pacote-de-contexto-enxuto — pacote de contexto enxuto

- **Status:** applied
- **Applied:** 2026-10-30
- **Date:** 2026-10-30
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** insight


## Why

Review de campo: o agente usou `prime` e `work` e não montou o pacote de
leitura — "o `prime` parece orientação suficiente e o `context` fica para
trás". Medido neste repositório, o motivo é o preço: `context gates --concat`
custava ~40k tokens (o AGENTS.md de novo, a spec inteira, dezesseis ADRs
inteiros) e `authoring` ~48k; o `--for "<tarefa>"` não cortava nada, porque
a degradação só começava ao estourar o orçamento de 50k.

## What

- lib/context-slice.js: `sliceSpec` (headers, Purpose e os requisitos e
  critérios que a tarefa mais casa, cada lacuna nomeada) e `adrDigest`
  (título + abertura da Decision).
- `context` enxuto por padrão: sem o AGENTS.md, ADRs em resumo, spec da
  tarefa e dependências recortadas com `--for`; `--full` devolve o texto
  inteiro.
- Medido: `gates --for` ~40k → ~5,5k; `authoring --for` ~48k → ~9,5k.
- Teste `o-pacote-de-contexto-e-enxuto.test.js` (com o teto de 10k como
  regressão); testes antigos que liam a ordem com o AGENTS.md e a escada de
  orçamento sobre ADRs inteiros passam `--full`; help; docs EN/PT;
  CHANGELOG.

## Scope boundaries

- Sem `--for`, a spec nomeada continua inteira.
- O orçamento e a escada de degradação continuam valendo por cima.

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
