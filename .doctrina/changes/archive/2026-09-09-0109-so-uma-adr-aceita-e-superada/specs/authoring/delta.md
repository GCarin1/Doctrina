# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

<!-- delta body below -->

Só uma decisão que valeu pode ser superada, e um título é um título.

```ops
append-requirement unwanted: The system shall not supersede an ADR whose Status is not `accepted`; `decision supersede` refuses a proposed or already-superseded target naming its current state and the remedy for a proposal that fell (set its Status to rejected, or delete it).
append-requirement unwanted: The system shall not create an ADR whose title is only digits; `decision supersede` refuses it and names the grammar `supersede <number> "<title>"`.
append-criterion [verified] `supersede` of a proposed ADR is refused naming the state, `supersede` of an accepted ADR still creates the successor and rewrites the target, and a digits-only title is refused with the grammar in the hint — verified by `packages/doctrina-cli/test/only-an-accepted-adr-is-superseded.test.js`.
bump-version minor
```
