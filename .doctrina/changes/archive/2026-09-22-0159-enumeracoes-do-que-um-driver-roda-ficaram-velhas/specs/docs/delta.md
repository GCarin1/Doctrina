# Spec Delta — capability: docs

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/docs/spec.md`

---

Uma página que abrevia o que um gate roda ensina um gate que não é o
instalado.

```ops
append-criterion [verified] No page in `docs/en/` or `docs/pt/` spells out what the pre-commit hook runs while naming fewer invocations than the shipped hook template makes — verified by `packages/doctrina-cli/test/o-que-um-driver-roda-tem-um-autor.test.js`.
bump-version patch
```
