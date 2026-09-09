# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

<!-- delta body below -->

Um documento bilíngue é varrido com os dois léxicos quando ninguém
declarou a língua.

```ops
append-requirement event: When `clarify` scans a document with no language forced by `--lang` and none declared in the project configuration, the system shall apply both the English and the Portuguese smell lexicons, so that a smell written in either language is reported.
append-criterion [verified] A spec carrying an English and a Portuguese vague term reports both under per-file detection and only the forced language's under `--lang` — verified by `packages/doctrina-cli/test/the-triage-speaks-portuguese.test.js`.
bump-version minor
```
