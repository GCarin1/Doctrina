# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

O `change diff`, depreciado desde a 0.16.0, sai; o `change check --verbose` imprime a mesma prévia.

O critério 11 foi reescrito à mão (o teste que o prova não compara mais com o
`change diff`, que não existe): `set-criterion` só troca a marca.

```ops
replace-requirement event 21: When `doctrina change diff <id>` is invoked after its removal in 0.17.0, the system shall run nothing and refuse with the usage class, naming `doctrina change check <id> --verbose`, which prints the same per-delta preview — ADDED with its line count, REMOVED with its target, MODIFIED as a line diff against the current spec.
bump-version minor
```
