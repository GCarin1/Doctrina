# Spec Delta — capability: structure

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/structure/spec.md`

---

O aviso de descrição de skill aponta para o `index rebuild`.

```ops
replace-requirement event 10: When `doctrina validate` runs, the system shall regenerate the index from the tree and emit an error for any artifact present in both the index and the tree (specs, decisions, changes, changes_archive, contracts) whose recorded metadata no longer matches its file — so a green `validate` cannot hide the drift `index rebuild --check` would catch (G5). Presence drift (orphan / missing file), the `framework_version` stamp, and skill descriptions stay advisory (warnings / `index rebuild`). With `--fix` the system shall rebuild the index from the tree before validating instead of erroring (ADR 0009).
replace-requirement event 11: When `doctrina validate` runs, the system shall compare each skill's frontmatter `description:` against the description recorded in `.doctrina/index.json` and emit a warning on mismatch, pointing at `doctrina index rebuild` (warnings only).
bump-version patch
```
