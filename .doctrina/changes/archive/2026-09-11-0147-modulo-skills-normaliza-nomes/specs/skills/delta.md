# Spec Delta — capability: skills

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/skills/spec.md`

---

O slug que o módulo gera passa a ser dobrado, não recortado: um nome
acentuado ou capitalizado sobrevive em vez de virar hifens, e o resultado
casa com a forma `[a-z][a-z0-9-]*` que a spec já exigia dos arquivos.

```ops
append-requirement ubiquitous: The system shall fold a generated skill slug — stripping diacritics and lowercasing — before reducing it to slug characters, so that an accented or capitalised source name survives as letters rather than as hyphens.
append-criterion [verified] A generated slug folds accents and capitals instead of deleting them, and matches the `[a-z][a-z0-9-]*` shape this spec requires of a skill filename — verified by `packages/doctrina-cli/test/o-acento-nao-e-ruido.test.js`.
bump-version minor
```
