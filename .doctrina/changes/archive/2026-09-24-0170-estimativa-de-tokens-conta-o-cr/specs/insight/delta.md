# Spec Delta — capability: insight

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/insight/spec.md`

---

A mesma árvore custa os mesmos tokens em qualquer sistema.

```ops
append-requirement ubiquitous: The system shall estimate a context pack's tokens with each line ending counted as one character, so that the same tree yields the same estimate and the same budget verdict on a CRLF checkout as on an LF one.
append-criterion [verified] A CRLF copy of a project estimates the same pack as its LF original, and a budget set exactly at that estimate passes on both — verified by `packages/doctrina-cli/test/o-orcamento-nao-depende-do-fim-de-linha.test.js`.
bump-version minor
```
