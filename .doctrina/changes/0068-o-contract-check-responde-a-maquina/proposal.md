# Change 0068-o-contract-check-responde-a-maquina — o contract check responde a maquina

- **Status:** proposed
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain; signals: declare)
- **Affects specs:** gates

## Why

o contract check --json devolve ok true para o estado que o proprio payload chama de unchecked, porque o unico sinal de maquina e o exit code; e o resumo humano tem um erro de concordancia em 1 contract declare

## What

A change 0056 tirou a palavra «consistent» do resumo humano do `contract check`.
O envelope máquina — o consumidor primário desta CLI — não mudou:

```json
{ "command": "contract check", "ok": true, "exit_code": 0,
  "stdout": ["...the runtime surface is unchecked", "warn 1 contract declare..."] }
```

O `ok` vem do exit code, que é 0 por decisão deliberada da change 0029:
superfície não declarada é reportada, não reprovada. Certo para o código de
saída, errado como **único** sinal de máquina. Quem lê só o envelope está
exatamente onde o leitor humano estava antes da 0056 — a correção parou uma
camada antes do fim.

A saída é a mesma que a change 0061 tomou para a depreciação: o fato entra num
campo próprio do payload, e o consumidor ramifica pela presença dele em vez de
pelo `ok`. Ou seja, o `contract check` passa a ser `jsonNative`, com `contracts`,
`declared_rows`, `unchecked` e `findings`.

Junto vai o erro de concordância que a 0056 embarcou: `1 contract declare`.

## Scope boundaries

- Não muda o código de saída de nenhum caso: a 0029 decidiu, e continua valendo.
- Não muda o resumo humano além da concordância.
- Não mexe nos checks RT01-RT05 nem no que cada um reporta por linha.

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
- [ ] `contract check --json` distingue superfície não declarada de superfície verificada, sem que o consumidor precise ler `stdout`.
- [ ] O `exit_code` continua 0 nos dois casos.
- [ ] O resumo humano concorda em número.
- [ ] Um teste lê o payload, não a prosa.
