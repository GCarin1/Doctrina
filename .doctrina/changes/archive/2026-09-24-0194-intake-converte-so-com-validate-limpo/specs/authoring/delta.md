# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

Converter o intake é afirmar que o bootstrap terminou.

```ops
append-requirement unwanted: The system shall not mark the stored intake converted while `doctrina validate` reports an error; it shall list the errors, name `doctrina validate --fix` for index drift, exit with the gate class and write nothing, and shall convert anyway only under `--force`, because converting makes the specs the source of truth and an error says they are not yet well-formed.
append-criterion [verified] Over a tree whose hand-edited spec drifted the index, `intake --converted` exits 1 naming the errors and the fix and leaves the intake pending; with `--force` it converts — verified by `packages/doctrina-cli/test/o-status-do-intake-tem-dono.test.js`.
bump-version minor
```
