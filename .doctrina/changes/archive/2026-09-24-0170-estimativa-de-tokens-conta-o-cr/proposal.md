# Change 0170-estimativa-de-tokens-conta-o-cr — estimativa de tokens conta o CR

- **Status:** applied
- **Applied:** 2026-09-23
- **Date:** 2026-09-23
- **Owner:**
- **Lane:** product
- **Affects specs:** insight


## Why

A estimativa de tokens do pack é chars/4 e contava o CR de cada linha CRLF. Num checkout do Windows, o mesmo conteúdo custava cerca de 2% a mais: comparando este repositório em LF e em CRLF, o pack de `core` deu `~8832` e `~8994` tokens. O orçamento é um gate (ADR 0022) e o CI roda o passo "Context budget gate" em Linux, macOS e Windows, então um pack perto do teto podia passar num runner e falhar em outro. O veredito dependia do fim de linha que o git escolheu, não do trabalho.

A mesma comparação não achou outra diferença: `validate`, `coverage`, `trace`, `status`, `show`, `why`, `analyze`, `clarify`, `review`, `doctor`, `handoff` e as listagens deram saída idêntica nas duas árvores (21 comandos comparados).

## What

- `packages/doctrina-cli/src/commands/context.js`: `estimateTokens` conta a quebra de linha como um caractere em qualquer sistema.
- `docs/{en,pt}/cli-reference.md`: a frase da estimativa diz isso.

## Scope boundaries

- O divisor (4) e o texto emitido pelo `--concat` não mudam: só a contagem.
- Contagens em linhas (teto do AGENTS.md, das specs) já não dependiam do fim de linha.

## Verification

- [x] `packages/doctrina-cli/test/o-orcamento-nao-depende-do-fim-de-linha.test.js` passa e falha no código anterior (3783 contra 3703 tokens).
- [x] Automated checks pass (`doctrina verify`).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

Nenhuma.
