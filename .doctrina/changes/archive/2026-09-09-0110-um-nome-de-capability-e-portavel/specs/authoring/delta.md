# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

<!-- delta body below -->

Um nome de artefato é um nome de pasta em todo sistema de arquivos que o
projeto vá tocar.

```ops
append-requirement ubiquitous: The system shall validate the name of a new spec, contract or skill against one shared grammar — lowercase letters, digits and hyphens, starting with a letter, no trailing or doubled hyphen, at most 64 characters, never a Windows reserved device name (con, prn, aux, nul, com1-com9, lpt1-lpt9) — and shall name the rule that failed.
append-criterion [verified] `spec new`, `contract new` and `skill new` refuse `nul`, `com1`, `trail-`, `a--b` and a 65-character name with exit 2 and nothing created, and every name in this repository passes — verified by `packages/doctrina-cli/test/a-name-is-portable.test.js`.
bump-version minor
```
