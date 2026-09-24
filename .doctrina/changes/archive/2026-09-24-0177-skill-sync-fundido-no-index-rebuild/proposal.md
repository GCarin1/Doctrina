# Change 0177-skill-sync-fundido-no-index-rebuild — skill sync fundido no index rebuild

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:**
- **Lane:** product
- **Affects specs:** skills, authoring, structure


## Why

O `index rebuild` já registra toda skill e espelha a `description:` do frontmatter no índice. O `skill sync` fazia o mesmo, só para skills, mais uma regra própria (change 0111): uma descrição ainda no formato `<...>` do template nunca sobrescreve uma que alguém escreveu. Era a única diferença, e ela era um defeito do rebuild: reverter a descrição de uma skill para o placeholder fazia o `index rebuild` (e o `validate --fix`, e o hook de pre-commit) servir o placeholder em todo pack de contexto, enquanto o `sync` o recusava.

Com a regra no rebuild, o `sync` não faz nada que o rebuild não faça; pela política do catálogo (ADR 0026), fica depreciado.

## What

- `packages/doctrina-cli/src/lib/scan.js`: a derivação de skills do rebuild mantém uma descrição escrita contra um placeholder e move a data da entrada só quando a descrição muda.
- `isScaffoldValue` passa a morar em `lib/doc-model.js` (o rebuild precisa dela e não pode importar `validation-model.js`, que o importa); `validation-model.js` reexporta.
- `DEPRECATED["skill sync"]` desde 0.17.0, apontando para `doctrina index rebuild`; o aviso do `validate` e a dica do `skill suggest --write` passam a nomear o rebuild.
- Bloco de comandos do `AGENTS.md` e do template regenerado; docs EN/PT (referência, skills, flow) e o README do pacote.

## Scope boundaries

- O `skill sync` não é removido: continua funcionando, com aviso, até uma minor posterior.
- Uma skill nova ainda no placeholder é indexada pelo rebuild (todo artefato em disco tem de estar no índice); o `sync` a pulava. O `validate` continua avisando que o placeholder não foi escrito.

## Verification

- [x] `packages/doctrina-cli/test/o-rebuild-faz-o-que-o-sync-fazia.test.js` passa (4 testes); no código anterior o cenário do placeholder diverge e o aviso de depreciação não existe (2 falhas).
- [x] `index rebuild --check` neste repositório não muda nada.
- [x] Automated checks pass (`doctrina verify`).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

Nenhuma.
