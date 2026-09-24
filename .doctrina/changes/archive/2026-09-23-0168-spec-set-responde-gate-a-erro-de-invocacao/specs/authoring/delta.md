# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

O `spec set` diz o que corrigir: a invocação ou a spec.

```ops
append-requirement event: When `doctrina spec set` refuses an operation, the system shall answer the usage class if any error lies in the invocation — a value outside the header's or the mark's domain, a malformed flag, a criterion the spec does not declare — and the gate class only when every error lies in the spec itself, because retrying an invocation error unchanged never succeeds.
append-criterion [verified] An out-of-domain value, a malformed flag and a missing criterion answer the usage class and leave the spec untouched, a spec lacking the header the operation needs answers the gate class and passes once repaired, and both at once answer the usage class — verified by `packages/doctrina-cli/test/spec-set-diz-o-que-corrigir.test.js`.
bump-version minor
```
