# Change 0080-o-report-nomeia-a-causa-certa — o report nomeia a causa certa

- **Status:** applied
- **Applied:** 2026-09-08
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** insight

## Why

o report diz que nao ha historico git porque nao e um repositorio ou o git nao esta instalado, quando as duas causas sao falsas e o repositorio apenas nao tem commits, enquanto o metrics acerta lendo o mesmo estado

## What

Num repositório git recém-criado, sem commits:

```
$ git rev-parse --is-inside-work-tree
true
$ doctrina report
## Git (local, last 7 days)

- no git history available (not a repository, or git not installed)
```

As duas causas nomeadas são falsas. É um repositório, e o git está instalado.
A causa real é a terceira, que a mensagem não cobre: não há commits ainda.

O `metrics`, lendo exatamente o mesmo estado, acerta:

```
no history to measure yet — this repository has no commits yet.
Commit some work and run this again.
```

Duas vistas do mesmo tree dizendo coisas diferentes sobre a mesma condição, e a
que erra é a que manda o leitor procurar um problema de instalação que não
existe. É o primeiro `report` de todo projeto novo — antes do primeiro commit é
exatamente quando ele é rodado.

## Scope boundaries

- Não muda o que o `report` mostra quando há histórico.
- Não faz o `report` executar nada além do que já executa: a distinção sai do
  que o git já responde.

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
- [x] Num repositório sem commits, o `report` nomeia a causa real.
- [x] Fora de um repositório, ele continua dizendo que não é um repositório.
- [x] `report` e `metrics` não discordam sobre o mesmo estado.

## Open questions

- Nenhuma.
