# ADR 0028 — Um gate de forma e um gate de prova: validate sai de gates para structure

- **Status:** accepted
- **Date:** 2026-09-11
- **Deciders:**
- **Scope:** gates, structure
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** `.doctrina/specs/structure/spec.md`, `.doctrina/specs/gates/spec.md`
- **Landed:** —

## Context

A spec `gates` cruzou o teto suave de 400 linhas pela segunda vez, com
427. Da primeira vez a metade somente-leitura saiu para `insight`; desta
vez era preciso escolher outro eixo, e a escolha não era óbvia.

Três eixos foram medidos contra a árvore real, em linhas efetivamente
removidas:

| Eixo | Requisitos | Linhas | `gates` depois |
|---|---|---|---|
| drivers (`close`, `doctor`, `ci`) | 11 | 20 | 411 — ainda acima |
| `verify` (+ signoff, clean) | 12 | 24 | ~403 — ainda acima |
| `validate` (o gate estrutural) | 21 | 101 | 331 — 69 de folga |

O eixo dos drivers era o mais tentador, porque a própria Purpose já
separava "os checks" dos "drivers que os sequenciam". Medido, ele não
resolvia: dividir uma capacidade e continuar reprovando no gate seria o
pior resultado possível.

## Decision

`doctrina validate` e a gramática do `.doctrina/` que ele cobra saem para
uma capacidade nova, `structure`.

O corte é entre duas perguntas que sempre foram distintas e estavam no
mesmo arquivo: **a árvore está bem-formada** e **a árvore está provada**.
A primeira é `validate`, e é feita antes de qualquer outra. A segunda é
`coverage`, `trace`, `review`, `verify`, `analyze`, `clarify`, com
`close`, `doctor` e `ci` sequenciando-as.

Um requisito que restringe `validate` **junto com** um daqueles fica em
`gates`, com a afirmação transversal a que pertence. Um fato não mora nos
dois arquivos.

`structure` reivindica `commands/validate.js` e
`lib/{ears,pipeline}.js`.

## Alternatives considered

**Dividir pelos drivers.** Coerente e já nomeado pela Purpose, mas devolve
20 linhas: a spec ficaria em 411, acima do teto, com uma capacidade nova
a mais para manter. Rejeitado pela medição, não pelo conceito.

**Dividir pelo `verify`.** Mesmo problema, com o agravante de separar o
gate de build do gate de cobertura que o `close` roda em sequência.

**Fundir `validate` na capacidade `validation`, que já detém
`lib/validation-model.js`.** Consolidaria comando e modelo, que hoje
respondem a capacidades diferentes. Rejeitado porque `validation` é o
Protocolo de Validação Empírica — mede se o Doctrina se paga numa equipe
adotante — e não tem relação com a gramática de artefatos. A fusão criaria
uma spec de duas cabeças para resolver um problema de contagem de linhas.

**Comprimir a prosa para caber.** Rejeitado: o teto é um orçamento de
leitura, não permissão para perder contrato.

## Consequences

**Positive**

- `gates` fica em 331 linhas, com 69 de folga — cerca de vinte requisitos
  futuros antes do próximo corte, contra os oito que o eixo dos drivers
  compraria.
- As duas perguntas ficam separadas no lugar onde um leitor as faz:
  "isto está bem-formado" tem spec própria.
- A cobertura sobrevive intacta: 265 critérios em 11 specs, 100%.

**Negative**

- A capacidade chamada `gates` deixa de conter o gate mais usado do
  projeto. A Purpose e o `## Out of scope` de cada lado apontam um para o
  outro para que a busca não falhe.
- Comando e modelo do `validate` seguem em capacidades diferentes:
  `structure` tem `commands/validate.js`, e `validation` mantém
  `lib/validation-model.js`. Isso é anterior a esta decisão e não foi
  resolvido por ela. Consolidar os dois é decisão própria, e esta ADR
  deliberadamente não a antecipa.
