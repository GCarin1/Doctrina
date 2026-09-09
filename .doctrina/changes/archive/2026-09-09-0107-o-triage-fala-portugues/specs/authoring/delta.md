# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

<!-- delta body below -->

O classificador de lanes lê o pedido na língua em que ele chega.

```ops
append-requirement ubiquitous: The system shall classify a prompt into its lane after folding it (accents stripped, case folded) and with signal lists that carry both English and Portuguese vocabularies, so that a request phrased in either language is read into the same lane.
append-requirement unwanted: The system shall not open a change for a Portuguese prompt that its English twin would be held as RUNTIME; `work` holds both with the precondition class.
append-criterion [verified] Runtime, chore and product prompts are read into the same lane in Portuguese and in English, accents do not change the scores, and `work` holds the Portuguese runtime prompt with exit 3 — verified by `packages/doctrina-cli/test/the-triage-speaks-portuguese.test.js`.
bump-version minor
```
