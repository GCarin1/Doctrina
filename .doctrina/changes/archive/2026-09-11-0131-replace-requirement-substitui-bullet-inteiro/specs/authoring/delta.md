# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

Um requisito EARS que se estende por duas ou mais linhas é um requisito,
não uma linha seguida de texto. `replace-requirement` escrevia só a primeira
linha, e a prosa da versão antiga ficava embaixo da nova, indentada,
lendo-se como parte dela.

O resultado não é cosmético: a spec passa a enunciar um contrato e a
contradizê-lo duas linhas abaixo, com a metade velha carregando o
comportamento anterior.

```ops
bump-version patch
set-header Last updated: 2026-09-11
append-requirement event: When an ops block replaces an EARS requirement that wraps over continuation lines, the system shall replace the whole item, so no line of the previous requirement survives beside the new one.
append-criterion [verified] Replacing a wrapped requirement removes its continuation lines, leaves the bullets around it intact, and still numbers by bullet rather than by line — verified by `packages/doctrina-cli/test/spec-ops.test.js`.
```
