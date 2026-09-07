# Change 0043-a-gramatica-on-disk-tem-um-dono — a gramatica on-disk tem um dono

- **Status:** applied
- **Applied:** 2026-09-07
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** validation

## Why

a ADR 0021 declara um modelo de documento dono da gramatica on-disk mas lib/scan.js importa parsers de commands/skill.js e commands/change.js, invertendo a direcao da dependencia; mover os parsers para o modelo de documento

## What

Corrige a direção das dependências entre `src/lib/` e `src/commands/`. Hoje
`src/lib/scan.js` importa `parseFrontmatter` de `commands/skill.js` e `parseOperation`
e `parseCapabilityFromDelta` de `commands/change.js` — uma biblioteca dependendo de
comandos.

- Os três parsers (mais o `isUntouchedScaffold`, que anda com eles) migram para
  `src/lib/doc-model.js`, que a ADR 0021 declara dono da gramática on-disk.
- Os módulos de comando passam a importar dali; os módulos intermediários somem.
- Teste estrutural: nada em `src/lib/` importa de `src/commands/`, E a gramática tem
  um dono só — uma segunda definição de qualquer um dos parsers quebra a suíte.
- Delta em `specs/validation`.

Nota de sequência: a change 0037 já havia quebrado a aresta `lib/ → commands/` ao
mover os parsers para fora dos comandos, e já trouxe o teste que a proíbe. O que
faltava — e é o que esta change entrega — era a COLOCAÇÃO: eles tinham parado em
duas bibliotecas novas ao lado do modelo, e não dentro dele. Uma gramática
espalhada por três arquivos de `lib/` não é a que a ADR 0021 declarou.

Achado F21 da auditoria. A ADR 0021 declara um modelo de documento dono da gramática, e
ela mora hoje em `doc-model.js`, `scan.js`, `criteria.js`, `ears.js`, `spec-ops.js`,
`runtime.js`, `pipeline.js` e em dois módulos de comando.

## Scope boundaries

- Não funde os sete módulos de gramática: eles podem seguir separados desde que a seta aponte sempre de `commands` para `lib`.
- Não muda nenhuma regra de parsing: é movimentação pura, coberta pelos testes existentes.
- Não toca `runtime.js` nem `pipeline.js`, que já vivem em `lib/`.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Nenhum módulo em `src/lib/` importa de `src/commands/`, provado por teste estrutural.
- [x] Os testes de parsing existentes passam sem alteração de expectativa.
- [x] `tsc --noEmit` segue limpo.

## Open questions

- Nenhuma.
