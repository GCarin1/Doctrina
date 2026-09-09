# Change 0105-a-marca-unverified-vale — a marca unverified vale

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product
- **Affects specs:** gates

## Why

um critério marcado [unverified] com prova que resolve faz validate propor verified e spec set --implementation auto promove a spec; a marca do autor é ignorada

## What

Critério 2 marcado `[unverified]`, citando um teste que existe. Medido:

```
validate → Implementation is "partial" but 2/2 criteria have resolving proof, which supports "verified"
spec set carteira --implementation auto → set Implementation: verified
why carteira → ○ #2   (só o why respeitava a marca)
```

O autor disse, no único lugar que o formato lhe dá, «não verificado»; a
aritmética passou por cima da frase. O template é explícito: cada critério
fica `[unverified]` até um teste citado o provar — o resolver do caminho é
o teste existir, não o teste provar.

Ligado não é certificado. A linha do critério carrega a marca do autor; a
derivação para em `implemented` — o degrau «o código está lá; não
certifiquei» — enquanto um critério coberto ainda estiver `[unverified]`.
`validate` diz quantos estão nessa condição, `coverage` lista-os com o op
que vira a marca, e `spec set --implementation auto` escreve `implemented`.
A cobertura em si não muda: a evidência ESTÁ ligada.

## Scope boundaries

- Não muda a porcentagem de cobertura nem o gate `--strict`: um critério
  `[unverified]` com prova que resolve continua coberto.
- Não altera o `why`, que já lia a marca.
- Não vira marca nenhuma sozinho — a marca é do autor.

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
- [x] Com um critério coberto ainda `[unverified]`, `validate` propõe `implemented` e `--implementation auto` escreve `implemented`.
- [x] Virada a marca, os mesmos caminhos leem `verified`.

## Open questions

- Nenhuma.
