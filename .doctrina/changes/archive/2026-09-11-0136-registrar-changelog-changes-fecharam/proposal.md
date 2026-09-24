# Change 0136-registrar-changelog-changes-fecharam — registrar no changelog as changes que fecharam antes do gate existir

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** chore — opened as chore
- **Affects specs:** (none — chore)

## Why

Catorze changes — 0121 a 0134 — entraram na develop antes de existir o
gate que a change 0135 acabou de criar. Todas passaram pelo `close`, todas
com o gate de documentação verde, e o `## [Unreleased]` continuou vazio.

O arquivo diz, na primeira linha, que toda mudança notável do Doctrina é
registrada ali. Catorze mudanças notáveis não estavam.

O gate novo impede a próxima. Não preenche as que já passaram, porque
escrever uma entrada de changelog é trabalho de dado: exige dizer o que
mudou e por que importa, e isso nenhuma máquina extrai de um diff.

## What

A seção `## [Unreleased]` recebe as entradas, agrupadas nas três
categorias do Keep a Changelog que o projeto segue.

Cada entrada diz o que mudou e o que aquilo custava antes, porque é isso
que um changelog serve para responder. As que compartilham uma causa
aparecem juntas — o harness e2e em uma, os dois testes instrumentados em
outra — com os números das changes entre parênteses para quem quiser o
histórico completo.

Uma entrada não foi escrita: a própria 0135, que já se registrou quando
fechou, sob o gate que ela criou.

## Scope boundaries

Não corta versão. A seção continua sendo `## [Unreleased]`, e decidir
quando isso vira 0.17.0 é do mantenedor, com a skill `cut-a-release`.

Não reescreve entradas de versões já publicadas.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] As catorze changes de 0121 a 0134 aparecem na seção, e a 0135 não foi duplicada.
- [x] `check-docs` segue limpo com a seção preenchida.

## Open questions

Nenhuma.
