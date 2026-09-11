# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

Merge manual, já aplicado à mão: uma divisão de capacidade move blocos
inteiros de requisito e renumera critérios, o que os verbos `ops` não
expressam. ADR 0028 registra a decisão e os eixos rejeitados.

O que saiu de `gates`, verbatim, para `.doctrina/specs/structure/spec.md`:

- 19 requisitos event-driven e 2 unwanted-behavior que restringem apenas
  `doctrina validate`.
- 8 critérios de aceitação que provam apenas aqueles requisitos.

O que ficou: todo requisito que restringe `validate` **junto com** outro
gate, com a afirmação transversal a que pertence.

Ajustes de cabeçalho e ponteiro: o `**Source:**` larga
`commands/validate.js` e `lib/{ears,pipeline}.js`; a `## Purpose` passa a
dizer que a pergunta "está bem-formado" é feita em `structure`; o
`## Out of scope` aponta para lá. Os 73 critérios restantes foram
renumerados em sequência.

Resultado: 427 linhas → 331, abaixo do teto de 400 com 69 de folga, e
cobertura intacta.
