# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

Uma substituta decide o mesmo assunto; começa com o mesmo alcance.

```ops
append-requirement event: When `doctrina decision supersede` creates a successor ADR, the system shall carry the superseded ADR's Scope into it and say so, because an unscoped ADR is global and the refinement of a decision that governed one capability would otherwise load into every context pack.
append-criterion [verified] A successor inherits its predecessor's scope and, once accepted, stays out of the packs its predecessor stayed out of, while an unscoped predecessor yields an unscoped successor — verified by `packages/doctrina-cli/test/uma-adr-substituta-herda-o-escopo.test.js`.
bump-version minor
```
