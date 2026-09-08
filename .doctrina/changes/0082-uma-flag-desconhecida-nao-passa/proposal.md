# Change 0082-uma-flag-desconhecida-nao-passa — uma flag desconhecida nao passa

- **Status:** proposed
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** cli

## Why

uma flag desconhecida e engolida em silencio, entao coverage --stricts sai 0 enquanto coverage --strict sai 1 na mesma arvore, e o gate que o operador pediu nunca rodou

## What

Numa árvore com um critério de aceite pendente:

```
$ doctrina coverage --strict    ; echo $?
1     ← o gate falha, correto
$ doctrina coverage --stricts   ; echo $?
0     ← o gate que você pediu nunca rodou, e nada avisa
```

A flag desconhecida é descartada em silêncio. Vale para `status`, `validate`,
`coverage`, `trace`, `review`, `next`, `prime`, `doctor` e `context`. No
`search` e no `work` ela é consumida como positional e o comando sai 2 por
outro motivo — mesmo defeito, sintoma diferente e igualmente mudo sobre a
causa.

O dano não é hipotético: um job de CI que rode `doctrina coverage --strict`
com um typo fica verde para sempre, sobre uma árvore que o gate reprovaria.
É a falha mais cara que um gate pode ter, porque ela se parece exatamente com
sucesso.

Cada comando **já declara** as flags que aceita (`export const flags`,
adicionado pela auditoria C3 justamente para fechar o buraco das flags
undeclared). A declaração existe e ninguém a usa para recusar: o entrypoint
faz o parse e entrega o que veio, casando ou não.

## Scope boundaries

- Não muda flag nenhuma que hoje é aceita, nem o significado de nenhuma: o
  que hoje funciona continua funcionando.
- Não mexe no parser de argumentos além de recusar o que não foi declarado.
- Não transforma um erro de uso em falha de gate: usagem errada é exit 2
  (ADR 0018), nunca 1.

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
- [ ] Uma flag não declarada é recusada, nomeando-a, com exit 2.
- [ ] Toda flag declarada hoje continua aceita, em todos os comandos.
- [ ] A recusa sugere a flag certa quando o que veio foi um typo.

## Open questions

- Nenhuma.
