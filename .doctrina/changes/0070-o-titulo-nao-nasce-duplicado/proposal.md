# Change 0070-o-titulo-nao-nasce-duplicado — o titulo nao nasce duplicado

- **Status:** proposed
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain; signals: change)
- **Affects specs:** authoring

## Why

sem --title o work escreve o prompt nas duas metades do H1, entao toda vista de leitura imprime o slug do prompt seguido da mesma frase inteira; a change 0052 corrigiu o parse, a geracao continua duplicando

## What

A change 0052 corrigiu o **parse** do título de uma change. A **geração**
continua duplicando: sem `--title`, o `work` escreve o prompt inteiro na segunda
metade do H1 e o slug do mesmo prompt na primeira.

```
# Change 0001-let-a-freelancer-send-a-partial-payment-receipt — let a
freelancer send a partial-payment receipt when a client pays half an invoice
```

Toda vista de leitura imprime as duas metades: o `prime` gasta 133 caracteres de
uma linha com a mesma frase duas vezes — e o `prime` é o comando que o
`AGENTS.md` manda rodar no início de toda sessão, cujo valor inteiro é densidade.

## Scope boundaries

- Não muda a geração do id: o slug derivado do prompt continua sendo o id.
- Não muda o parse — ele está certo desde a 0052; o defeito é a montagem.
- Não passa a exigir `--title`: o comando continua funcionando sem ele.

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
- [ ] Sem `--title`, o H1 não repete o que o id já diz.
- [ ] Com `--title`, o comportamento é o de hoje.
- [ ] O `prime`, o `handoff` e o `report` cabem numa linha legível para uma change aberta pelo caminho padrão.
