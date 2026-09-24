# Change 0175-remover-constitution-e-change-diff — remover constitution e change diff

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:**
- **Lane:** product
- **Affects specs:** cli, authoring, insight, gates


## Why

`constitution` (→ `prime --rules`) e `change diff` (→ `change check --verbose`) foram depreciados na 0.16.0 com a promessa "will be removed in a later minor", e a remoção nunca veio: os dois continuavam no `--help`, nos completions e no catálogo, ocupando duas das 61 operações. A 0.17.0 é a minor seguinte.

Quem tiver o nome antigo num script ou no hábito não deve receber "unknown command, did you mean…?", que chuta um vizinho: deve saber o que usar no lugar.

## What

- Removidos: `packages/doctrina-cli/src/commands/constitution.js`, o `changeDiff` de `change.js`, as duas entradas do catálogo e do `DEPRECATED`. `lib/constitution-model.js` fica: é o coletor do `prime --rules`.
- `lib/commands.js`: registro `REMOVED` e `removalFor`; o `index.js` responde a um nome removido com exit 2, a versão e o substituto, também no envelope `--json`.
- Testes: a prova de fusão vira prova de remoção; os testes do mecanismo de depreciação passam a usar `report` e `skill sync`; `change check --verbose` e `prime --rules` ganham prova própria.
- Docs EN/PT: seções dos dois comandos removidas (o conteúdo útil sobre non-goals foi para a seção do `prime`), contagens 38→37 comandos e 61→59 operações, exemplo do `docs/*/README.md` e README do pacote.

## Scope boundaries

- `report`, `skill sync` e `templates check|update`, depreciados nas changes 0176–0178, continuam: a remoção deles é de uma minor posterior.
- Menções históricas ao `constitution.md` do Spec Kit (comparison, migration, deferred) ficam: falam do arquivo do outro framework.

## Verification

- [x] `packages/doctrina-cli/test/deprecation.test.js` passa (11 testes), incluindo a resposta aos nomes removidos.
- [x] `node scripts/check-docs.js` limpo com as contagens novas.
- [x] Automated checks pass (`doctrina verify`).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

Nenhuma.
