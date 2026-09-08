# Change 0067-uma-contagem-de-caixas — uma contagem de caixas

- **Status:** proposed
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain; signals: change)
- **Affects specs:** validation

## Why

as mesmas caixas de uma change tem tres contagens diferentes na mesma arvore: o prime diz tasks 0 de 3, o next diz 6 open tasks e o change tick lista 8, porque o snapshot exige texto depois da caixa e nao ve os placeholders vazios

## What

As mesmas caixas, na mesma árvore, no mesmo instante, contadas de três formas:

```
$ doctrina prime
  0003-flag-a-duplicate-bank-credit  … (proposed · tasks 0/3)
$ doctrina next
1. complete 6 open tasks in .doctrina/changes/0003-.../tasks.md
$ doctrina change tick 0003-...
    1. ... 8.   (oito caixas listadas)
```

A causa não é «uns contam os closing steps, outros não». O `snapshot.js` exige
texto **depois** da caixa, então os três placeholders vazios do scaffold são
invisíveis para ele — e as três que ele conta são justamente os *closing steps*,
não o trabalho. O `gates.js` não exige texto, e conta seis.

Um agente lendo `prime` vê «tasks 0/3» e acredita que há três tarefas escritas.
Há três caixas vazias e três passos de encerramento. É o ADR 0021 outra vez: a
gramática on-disk tem um dono, e a contagem de caixas escapou dele.

## Scope boundaries

- Não muda o que cada superfície escolhe mostrar: o `prime` pode continuar
  resumindo e o `tick` continuar listando tudo. O que passa a ser único é a
  contagem, não a apresentação.
- Não muda o formato de `tasks.md` nem o que o `analyze` exige dele.

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
- [ ] As três superfícies relatam o mesmo número de caixas abertas para a mesma change.
- [ ] Uma caixa de scaffold vazia é contada, e é distinguível de uma tarefa escrita.
- [ ] A contagem tem um dono só, no document model, e nenhum outro módulo redefine a regex.
