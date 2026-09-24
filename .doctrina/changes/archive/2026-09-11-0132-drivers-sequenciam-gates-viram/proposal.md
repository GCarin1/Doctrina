# Change 0132-drivers-sequenciam-gates-viram — os drivers que sequenciam os gates viram a capacidade closing, tirando a spec gates do teto de 400 linhas

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** product (uncertain; signals: spec)
- **Affects specs:** gates, structure gates

## Why

A spec `gates` cruzou o teto suave de 400 linhas pela segunda vez, com
427. Da primeira vez a metade somente-leitura saiu para `insight`; desta
vez era preciso escolher outro eixo, e a escolha não era óbvia.

O eixo tentador era o dos drivers — `close`, `doctor`, `ci` —, já nomeado
pela própria Purpose da spec, que separa "os checks" dos "drivers que os
sequenciam". Medido contra a árvore real, ele devolvia 20 linhas e
deixava a spec em 411: ainda acima do teto, agora com uma capacidade a
mais para manter. Dividir uma capacidade e continuar reprovando seria o
pior resultado possível, então esse eixo foi descartado pela medição.

O eixo que resolve é `validate`. Sozinho ele ocupa 101 das 427 linhas, e
é o maior aglomerado da spec que nomeia uma capacidade por si.

E há uma razão melhor que a aritmética. `validate` responde a pergunta
"esta árvore está bem-formada", que é feita ANTES de qualquer outra e é
de natureza diferente de "esta árvore está provada". As duas moravam no
mesmo arquivo por acidente de crescimento, não por parentesco.

## What

`doctrina validate` e a gramática do `.doctrina/` que ele cobra saem para
a capacidade nova `structure`.

Movem-se verbatim 19 requisitos event-driven, 2 unwanted-behavior e 8
critérios de aceitação — todos os que restringem apenas `validate`. Um
requisito que restringe `validate` junto com outro gate fica em `gates`,
com a afirmação transversal a que pertence; nenhum fato mora nos dois
arquivos.

`structure` reivindica `commands/validate.js` e `lib/{ears,pipeline}.js`.
As duas Purposes e os dois `## Out of scope` apontam um para o outro.

Quatro ADRs que já governavam `gates` — 0008, 0009, 0010 e 0014 — passam
a nomear `structure` no `Scope:`, porque governam requisitos que se
mudaram de arquivo. Só o cabeçalho muda; o corpo das ADRs segue imutável.

ADR 0028 registra a decisão, a tabela de medição dos três eixos e as
quatro alternativas rejeitadas.

## Scope boundaries

Nenhum requisito foi reescrito na mudança de arquivo — uma change, uma
intenção, que é a regra da skill `split-an-oversized-spec`. O texto que
chega em `structure` é byte a byte o que saiu de `gates`, só renumerado.

Não consolida comando e modelo do `validate`, que seguem em capacidades
diferentes: `structure` tem `commands/validate.js`, `validation` mantém
`lib/validation-model.js`. Isso é anterior a esta change, e resolvê-lo
por tabela aqui esconderia uma decisão dentro de outra. A ADR 0028
registra a pendência em Consequences.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] `gates` cai de 427 para 331 linhas e o aviso do teto desaparece.
- [x] Cobertura intacta: 265 critérios em 11 specs, 100%.
- [x] `trace --strict` segue com 5 de 5 âncoras, e o pacote de contexto de cada capacidade cabe no orçamento.

## Open questions

Nenhuma.
