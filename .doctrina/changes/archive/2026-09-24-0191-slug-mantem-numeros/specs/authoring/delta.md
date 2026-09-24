# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

Um número é conteúdo no id de uma change.

```ops
append-requirement ubiquitous: The system shall keep a version or a number from the prompt in a derived change slug — "cortar a 0.17.0" slugs to `cortar-0-17-0`, "migrar para Node 24" to `migrar-node-24` — reading the slug's own tokens rather than the retrieval tokenizer's letter-first words, while still dropping stopwords and one-letter words.
append-criterion [verified] Prompts carrying a version or a number keep it in the slug, and one-letter words are still dropped — verified by `packages/doctrina-cli/test/change-title.test.js`.
bump-version patch
```
