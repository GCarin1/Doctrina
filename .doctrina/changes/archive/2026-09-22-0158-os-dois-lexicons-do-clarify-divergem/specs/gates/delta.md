# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

Um smell test que responde diferente conforme a língua não está medindo a
escrita.

```ops
append-requirement ubiquitous: The system shall offer the same smell categories in every language lexicon it carries, so that a document and its translation receive the same verdict; a term that belongs to one language only shall carry, beside it, the reason it cannot cross.
append-criterion [verified] The same claim written in English and in Portuguese produces the same smells, and both lexicons declare the same rule names — verified by `packages/doctrina-cli/test/um-smell-test-nao-muda-de-lingua.test.js`.
bump-version minor
```
