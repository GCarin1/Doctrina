# Change 0097-um-exemplo-em-fence-nao-e-criterio — um exemplo em fence nao e criterio

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product (uncertain; signals: spec)
- **Affects specs:** validation

## Why

criterios de aceitacao dentro de um bloco de codigo cercado sao contados como criterios reais pelo coverage e devolvidos pelo show, entao uma spec que cita o proprio formato infla a cobertura com exemplos
## What

`parseAcceptanceCriteria` passa a rastrear blocos cercados: conteúdo dentro
de uma fence é retrato de um critério, nunca um. O estado da fence é seguido
sobre o arquivo INTEIRO, para que um `## Acceptance criteria` dentro de um
exemplo não abra a seção.

E a metade que a auditoria não viu: `lib/criteria.js` abre a dizer que é o
parser único por onde toda superfície lê critérios — e não era.
`coverage-model.js` carregava uma segunda implementação. Provou-se ao
corrigir a fence num deles: o `show` passou a contar 1 e o `coverage`
continuou a contar 3. O segundo parser foi removido; o `coverage` lê pelo
partilhado.

Terceira auditoria, achado 4. Uma spec que documenta o próprio formato
escrevia um critério de exemplo `[verified]` a citar `pkg/x.js`, e isso
inflava o denominador da cobertura e respondia ao `show <cap>-C2`.

## Scope boundaries

- Não muda o que conta como prova (a heurística de caminho em backticks fica como está).
- Não avisa sobre fence não fechada. Uma fence aberta corre até ao fim do arquivo, que é o comportamento do Markdown; se isso merecer um aviso, é do `validate` e é outra change.
- Não toca a numeração: o `coverage` continua a numerar por ordem e o `show` pelo número declarado, como antes.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Um exemplo cercado não é contado, e a citação dele não vira prova do critério real.
- [x] `coverage` e `show` concordam sobre a mesma spec, por lerem pelo mesmo parser.
- [x] Um `## Acceptance criteria` dentro de uma fence não abre a seção.
- [x] `~~~` conta como fence, e uma fence mais longa só fecha com marcador pelo menos igual.

## Open questions

- Nenhuma.
