# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

<!-- delta body below -->

Depois da conversão, as specs são a verdade; o intake não volta atrás.

```ops
append-requirement unwanted: The system shall not overwrite an intake whose Status is `converted`, even under `--force`; `intake` refuses with the precondition class and points at `intent add` for new intent and `work` for a change of behaviour, while an intake still `pending` may be replaced.
append-criterion [verified] `intake --force` over a converted intake exits 3, leaves the file untouched and names `intent add` and `work`; over a pending intake it replaces the file — verified by `packages/doctrina-cli/test/a-converted-intake-does-not-go-back.test.js`.
bump-version minor
```
