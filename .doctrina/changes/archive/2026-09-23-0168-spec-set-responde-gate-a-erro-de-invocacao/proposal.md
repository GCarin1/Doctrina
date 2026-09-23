# Change 0168-spec-set-responde-gate-a-erro-de-invocacao — spec set responde GATE a erro de invocacao

- **Status:** applied
- **Applied:** 2026-09-23
- **Date:** 2026-09-23
- **Owner:**
- **Lane:** product
- **Affects specs:** authoring


## Why

O ADR 0018 dá `1` (GATE) a "corrija o trabalho e repita o mesmo comando" e `2` (USAGE) a "não repita igual; corrija a invocação". Todo erro de operação do `spec set` respondia `1`, inclusive um valor fora do domínio (`--status banana`), uma flag malformada (`--criterion 9=verified`) e um critério que não existe (`--criterion 99:verified`), casos em que nenhuma edição na spec faz o comando passar. Um agente que lê o código repete o mesmo comando para sempre.

O próprio `docs/en/exit-codes.md` já promete `2` do `spec set` para "um critério que a spec não declara", e o `show carteira-C99` já responde `2` ao mesmo critério ausente. Reproduzido: `spec set carteira --criterion 99:verified` → exit 1; `spec set carteira --status banana` → exit 1.

## What

- `packages/doctrina-cli/src/lib/spec-ops.js`: os erros causados pelo valor ou pela referência fornecidos (domínio do cabeçalho, domínio da marca, critério inexistente) levam `cause: "argument"`. É um fato neutro: num delta, o mesmo erro continua sendo defeito do trabalho.
- `packages/doctrina-cli/src/commands/spec.js`: cada erro diz se é da invocação ou da spec; o `spec set` responde USAGE quando há algum erro de invocação e GATE só quando todos são da spec (cabeçalho ou seção ausente, `--implementation auto` sem critérios).
- `docs/en/exit-codes.md` e `docs/pt/exit-codes.md`: o valor fora do domínio entra na lista do `2`, e o caso GATE do `spec set` é dito.

## Scope boundaries

- `change apply` e `analyze` não mudam: num delta, um valor fora do domínio é defeito do trabalho e continua GATE.
- O "já existe" dos comandos `new` continua `1`; é consistente entre eles e não entra aqui.

## Verification

- [x] `packages/doctrina-cli/test/spec-set-diz-o-que-corrigir.test.js` passa (3 testes) e falha 2 deles no código anterior (`git stash`).
- [x] Automated checks pass (`doctrina verify`).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

Nenhuma.
