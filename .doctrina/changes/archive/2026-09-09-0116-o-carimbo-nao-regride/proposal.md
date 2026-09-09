# Change 0116-o-carimbo-nao-regride — o carimbo nao regride

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product
- **Affects specs:** scaffolding, gates

## Why

o hook instalado por hooks install chama o doctrina do PATH e um CLI mais velho rebaixa o carimbo framework_version em silêncio; index rebuild --check então falha no CI

## What

Medido num projeto adotante carimbado `0.15.1` pelo CLI de desenvolvimento,
com um `doctrina-cli@0.15.0` global no PATH:

```
hooks install            → .git/hooks/pre-commit: `doctrina validate --fix`
git commit               → o hook roda o 0.15.0 global; index.json: 0.15.1 → 0.15.0, sem aviso
validate (0.15.1)        → warn: framework_version is "0.15.0" but the running CLI is 0.15.1
index rebuild --check    → fail: drift framework_version 0.15.0 -> 0.15.1   (o gate da action de CI)
```

Dois defeitos. O hook chama o que estiver no PATH, não o CLI que o
instalou — e `.git/hooks/` é por clone, então o hook pode (e deve) fixar o
caminho absoluto do CLI que o escreveu, com `DOCTRINA=` como override. E
`index rebuild`/`validate --fix` de um CLI mais velho reescrevem o carimbo
para trás em silêncio: dois colegas com versões diferentes fazem o carimbo
pingar a cada commit e o CI ficar vermelho em dias alternados.

O carimbo passa a ser monotónico: `save` nunca escreve uma versão menor do
que a que já está no índice. Um CLI mais velho que lê um carimbo à frente
avisa que a árvore é gerida por um CLI mais novo («upgrade the CLI»), e
`index rebuild --check` não conta isso como drift do índice.

## Scope boundaries

- Não muda a migração para a frente: um CLI mais novo continua carimbando
  ao `index rebuild`.
- Não versiona o hook: `.git/hooks/` continua local, como sempre foi.

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
- [x] O hook instalado invoca o CLI que o instalou, com `DOCTRINA=` como override.
- [x] `save` nunca rebaixa o carimbo; um CLI atrás do carimbo avisa «upgrade» e `rebuild --check` não falha por isso.

## Open questions

- Nenhuma.
