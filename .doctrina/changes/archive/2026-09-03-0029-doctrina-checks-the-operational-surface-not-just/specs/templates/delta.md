# Spec Delta — capability: templates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/templates/spec.md`

---

The contract template carries the runtime declaration tables; the spec
template carries the optional ordered-pipeline block.

```ops
append-requirement ubiquitous: The contract template shall carry Wiring, Selectors and Budgets tables, and a Values column on Environment, each documenting what the corresponding runtime check verifies.
append-requirement ubiquitous: The spec template shall carry an optional `### Pipeline` block documenting that a step may only require what an earlier step produced.
append-requirement must-not: A freshly scaffolded contract shall not fail its own `contract check`: placeholder rows are scaffolding, not declarations.
append-criterion [verified] A scaffolded contract passes `contract check` and reports its runtime surface as unchecked — verified by `packages/doctrina-cli/test/runtime-commands.test.js`.
bump-version minor
```
