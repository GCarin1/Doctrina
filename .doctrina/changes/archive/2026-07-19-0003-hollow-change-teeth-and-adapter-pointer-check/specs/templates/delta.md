# Spec Delta — capability: templates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/templates/spec.md`

---

Adapters are thin pointers at AGENTS.md — the property that lets one
`doctrina upgrade --write` surface refresh reach every installed agent.
`templates check` now verifies the property instead of assuming it.

```ops
bump-version minor
set-header Last updated: 2026-07-19
append-requirement event: When `doctrina templates check` runs, the system shall verify each installed agent adapter (inventoried from the shipped adapter template tree) still references `AGENTS.md`, and shall report a finding with the fix when the pointer is gone.
append-criterion [verified] A broken adapter pointer is a named `templates check` finding — verified by `packages/doctrina-cli/test/integration.test.js`.
```
