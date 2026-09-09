# Change 0078-a-recomendacao-sabe-o-que-custa — a recomendacao sabe o que custa

- **Status:** applied
- **Applied:** 2026-09-08
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** templates

## Why

o templates check recomenda seções cujo remédio funciona mas leva o AGENTS.md deste repo de 147 para 155 linhas, acima do teto de 150 que o analyze recusa subir, e nada diz que uma recomendação custa mais do que o outro gate permite

## What

O `templates check` recomenda duas seções ausentes no AGENTS.md deste repo:

```
✗ AGENTS.md missing recommended section "## Commands"
    fix: doctrina templates update --write
✗ AGENTS.md missing recommended section "## Repository structure"
    fix: doctrina templates update --write
```

O remédio funciona — a regra C2 está intacta, verificada rodando-o: ele anexa
os dois stubs e o check fica verde. O problema é o preço. Rodá-lo aqui leva o
AGENTS.md de **147 para 155 linhas**, e o teto declarado é 150:

```
warn  budgets   AGENTS.md 155/150 lines — over a declared ceiling
warn:  AGENTS.md is 155 lines (>150 soft limit)
```

`agents-md-lines` é OUTPUT: o `analyze` recusa, por desenho, uma change que
resolva o estouro subindo o teto. Ou seja, um gate advisory manda fazer
exatamente o que outro gate proíbe desfazer — e nenhum dos dois menciona o
outro.

A change 0072 tornou o acoplamento entre os dois orçamentos visível no
`doctor`. Falta o lado da RECOMENDAÇÃO consultá-lo: quem sugere adicionar
texto a um arquivo com teto declarado precisa dizer o que a sugestão custa, e
segurar-se quando não cabe.

## Scope boundaries

- Não remove a recomendação nem afrouxa o teto: as duas seções continuam
  recomendadas e 150 continua sendo 150.
- Não muda o que o `templates update --write` escreve quando há folga.

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
- [x] A recomendação diz o que custa em linhas antes de ser seguida.
- [x] Num projeto sem folga, seguir o remédio não estoura o teto em silêncio.
- [x] Num projeto com folga, o comportamento não muda.

## Open questions

- Nenhuma.
