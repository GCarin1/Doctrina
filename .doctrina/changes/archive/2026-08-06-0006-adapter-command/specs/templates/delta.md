# Spec Delta — capability: templates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/templates/spec.md`

---

Adapters resolve through a chain rather than from the bundled set alone,
so a team can ship an adapter for an agent Doctrina does not know about.
This is the same resolution the project-local template override needs.

```ops
bump-version minor
set-header Last updated: 2026-08-06
append-requirement event: When an adapter is resolved by name, the system shall prefer a project-local directory at `.doctrina/templates/adapters/<name>/` over a bundled adapter of the same name, and shall report which source it used.
append-criterion [verified] A project-local adapter is installable by name and overrides a bundled adapter of the same name — verified by `packages/doctrina-cli/test/integration.test.js`.
```
