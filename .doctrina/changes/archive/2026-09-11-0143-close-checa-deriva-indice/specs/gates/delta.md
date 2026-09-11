# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

O check de deriva de índice já rodava no `close`, dentro do `verify` — e é
por isso que ele não pegou. O `verify` fica cinco passos antes do
`archive`, e o `archive` é o último passo que ESCREVE o índice.

Um gate colocado antes do passo que ele guarda não guarda nada.

```ops
bump-version minor
set-header Last updated: 2026-09-11
append-requirement event: When `doctrina close` finishes writing — after the archive step, which is the last step that rewrites the index — the system shall compare the index against a rebuild and refuse the close when the two disagree.
append-criterion [verified] The drift step is declared after the archive, a close refuses on an index whose order disagrees with a rebuild even though `validate` passes it, and a clean close leaves an index a rebuild agrees with — verified by `packages/doctrina-cli/test/the-close-checks-what-it-wrote.test.js`.
```
