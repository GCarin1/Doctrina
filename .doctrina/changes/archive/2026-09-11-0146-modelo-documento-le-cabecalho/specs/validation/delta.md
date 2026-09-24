# Spec Delta — capability: validation

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/validation/spec.md`

---

Este módulo é o dono da regra de que um comentário HTML é anotação, e todo
o resto da árvore defere a ele. Os dois leitores de cabeçalho não aplicavam
a própria regra.

O preâmbulo é exatamente onde um template põe a orientação, então um
cabeçalho de EXEMPLO, escrito para mostrar a forma a quem autora, contava
como cabeçalho autorado.

```ops
bump-version minor
set-header Last updated: 2026-09-11
append-requirement unwanted: The system shall not read a metadata header out of an HTML comment, in any reader or writer of the document model, because annotation is not something the author wrote.
append-criterion [verified] A header inside a comment is collected by neither reader and written over by neither writer, and a real header beside a commented example is the one both return — verified by `packages/doctrina-cli/test/doc-model.test.js`.
```
