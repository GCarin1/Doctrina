# Change 0086-o-envelope-json-nao-mente — o envelope json nao mente

- **Status:** proposed
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** cli

## Why

o envelope json emite ok true e exit_code zero por padrao, entao coverage --strict e trace --strict saem 1 no processo enquanto o payload afirma aprovacao, e o exit_code do payload e sempre zero em todo comando nativo

## What

```
$ doctrina coverage --strict          ; echo $?
1                                     ← o gate falha, correto
$ doctrina coverage --strict --json   ; echo $?
1                                     ← o processo também sai 1
{ "ok": true, "exit_code": 0, ... }   ← o payload afirma aprovação
```

`emitJson` tem defaults `ok = true, exitCode = EXIT.OK`, e **nove dos dez**
call sites não passam nenhum dos dois. O envelope é escrito ANTES de o valor
de retorno ser calculado — em `coverage.js:96` o `emitJson` vem uma linha
acima do `return jsonClean ? 0 : strict ? 1 : 0`.

Medido:

| gate (falhando)      | exit do processo | `payload.ok` | `payload.exit_code` |
|----------------------|------------------|--------------|---------------------|
| `validate` com drift | 1                | false        | **0**               |
| `coverage --strict`  | 1                | **true**     | **0**               |
| `trace --strict`     | 1                | **true**     | **0**               |

O `exit_code` do payload é **sempre 0**, em todo comando nativo. O `ok` só
acerta no `validate` — e por acidente: ele passa `ok` dentro do `data`, e o
spread `...data` sobrescreve o campo do envelope por cima.

A documentação diz, sobre esses dois campos, «Branch on those». O `--json`
existe para que «um loop autônomo nunca precise interpretar inglês» — e é
justamente o consumidor que lê o payload, e não o exit do processo, que
recebe a mentira.

## Scope boundaries

- Não muda nenhum payload: os campos de dados de cada comando continuam
  exatamente como estão.
- Não muda nenhum exit code de processo: o que sai 1 hoje continua saindo 1.
- Não transforma `ok` em «o gate passou» onde ele significa «o comando
  executou»: o valor passa a ser o mesmo que o exit code do processo diz.

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
- [ ] `payload.exit_code` é igual ao código com que o processo sai.
- [ ] `payload.ok` é falso exatamente quando esse código não é zero.
- [ ] Nenhum campo de dados de nenhum payload muda.

## Open questions

- Nenhuma.
