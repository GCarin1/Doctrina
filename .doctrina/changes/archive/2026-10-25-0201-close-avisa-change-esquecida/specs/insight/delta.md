# Spec Delta — capability: insight

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/insight/spec.md`

---

```ops
append-requirement ubiquitous: The system shall show, in `prime`'s open work, how long a change has been open once it is 7 days or more.
append-criterion [verified] `prime` lists a change opened 20 days ago with `open 20d` — verified by `packages/doctrina-cli/test/o-close-avisa-a-change-esquecida.test.js`.
bump-version minor
```
