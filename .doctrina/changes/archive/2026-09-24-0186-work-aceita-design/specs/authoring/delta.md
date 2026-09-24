# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

O `work` abre toda change que o `change new` abre.

```ops
append-requirement event: When `doctrina work` runs with `--design`, the system shall also scaffold the change's `design.md`, identical to the one `doctrina change new --design` writes, and without the flag shall scaffold none, so a change that needs a design document never has to leave the recommended door for the manual one.
append-criterion [verified] `work --design` writes the design.md that `change new --design` writes for the same title, and `work` without the flag writes none — verified by `packages/doctrina-cli/test/o-work-esboca-o-design.test.js`.
bump-version minor
```
