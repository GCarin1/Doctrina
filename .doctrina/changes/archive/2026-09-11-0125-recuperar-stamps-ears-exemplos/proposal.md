# Change 0125-recuperar-stamps-ears-exemplos — recuperar os stamps e o EARS dos exemplos publicados

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** chore — opened as chore
- **Affects specs:** (none — chore)

## Why

Os dois exemplos que o repositório publica tinham apodrecido.

Ambos carimbavam `framework_version: 0.14.0` no `index.json`, dois cortes
de versão atrás. Um exemplo é a primeira árvore que muita gente copia, e
copiar um stamp velho é começar com o aviso de migração já aceso.

O segundo defeito é pior, porque é o exemplo contradizendo a própria
lição. Em `typescript-express-retrofit`, o requisito state-driven
enunciava um invariante como fato:

    - While the process is running, all counters are held in memory.

Falta o `shall`. É exatamente o erro de EARS que aquele exemplo existe
para ensinar a evitar, e o comentário do `ci.yml` registra que esse mesmo
defeito já havia sido corrigido uma vez. Ele voltou.

Voltou porque o passo de CI que roda os exemplos usa `doctrina validate`,
que sai com código 0 quando há apenas warnings — e os dois defeitos são
warnings. O gate existe, roda em toda execução, e não tem como reprovar.

## What

Regravar o `index.json` dos dois exemplos com `doctrina index rebuild`,
que sincroniza o stamp para 0.16.0.

Corrigir o requisito state-driven para a forma que o exemplo ensina,
preservando a nota sobre reinício que vem logo depois:

    - While the process is running, the system shall hold all counters
      in memory. Restarting the process clears all counters; this is
      documented in ADR 0002.

Os dois exemplos passam a validar com zero warnings.

## Scope boundaries

Não toca o buraco que deixou o defeito voltar: o passo de CI continua
incapaz de reprovar em warning. Isso é uma capacidade que o `validate`
não tem, não um dado podre, e por isso vai em change própria, na faixa
de produto, com delta de spec.

Esta change devolve os exemplos ao verde; a seguinte impede a terceira
regressão.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] `doctrina validate` passa nos dois exemplos com zero warnings.

## Open questions

Nenhuma.
