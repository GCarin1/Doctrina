# Change 0093-o-contrato-de-saida-vale-para-todos — o contrato de saida vale para todos

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** cli

## Why

uma referencia que nao resolve sai 1 em seis comandos, 0 em dois e 2 em um so, e o search e a unica das sete listas que recusa quando nao acha nada

## What

O ADR 0018 declara cinco classes, e duas delas dizem coisas diferentes ao
consumidor: `1` é GATE («conserte o trabalho e repita»), `2` é USAGE
(«corrija a invocação»). Medido sobre uma referência que não existe:

| comando                                    | classe |
|--------------------------------------------|--------|
| `show`, `why`, `change check`, `spec set`, `decision accept`, `analyze` | **1** |
| `decision scope`, `context`                | **0** |
| `coverage --only` (corrigido na change 0090) | **2** |

Nove comandos, três respostas para a mesma pergunta. Digitar o nome errado
não pede que ninguém conserte o trabalho — pede que corrija o comando. E
`decision scope 9999` saindo **0** é o pior dos três: aprova.

O segundo desvio, na direção oposta. Das sete listas do CLI, seis saem 0
quando não há o que listar; só o `search` sai **1**:

```
search zzzz  → 1        spec list, decision list, skill list,
                        contract list, templates list, intent list → 0
```

A spec do `insight` diz, sobre esta família: «a VIEW assembles what is there
and never refuses anything». Não achar não é falhar — é a resposta. O exit 1
segue a convenção do `grep`, mas o Doctrina declarou um contrato próprio de
cinco classes, e uma classe que significa duas coisas não serve para o
consumidor que o `--json` e os exit codes existem para servir.

## Scope boundaries

- Não muda nenhuma classe que já está correta: o que hoje sai 0 por sucesso,
  1 por gate reprovado e 3 por precondição continua igual.
- Não muda o texto de nenhum erro além do necessário para nomear a classe.
- Não mexe no `--json`: o envelope já deriva do código (change 0086), então
  ele acompanha sozinho.

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
- [x] Uma referência que não resolve usa a mesma classe em todos os comandos.
- [x] Uma vista sem resultado não recusa.
- [x] Nenhum comando que hoje sai 0, 1 (por gate) ou 3 muda de classe.

## Open questions

- Nenhuma.
