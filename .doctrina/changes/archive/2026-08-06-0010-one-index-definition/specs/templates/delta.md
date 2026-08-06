# Spec Delta — capability: templates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/templates/spec.md`

---

Audit item C5. Two definitions of a correct `index.json` — the shape
`init` materialised from a template file and the shape `templates check`
required — with nothing comparing them. When `contracts` was added to the
expected shape and not to the template, every new project was born with a
pending scaffold update.

```ops
bump-version patch
set-header Last updated: 2026-08-06
append-requirement ubiquitous: The system shall hold one definition of the artifact categories a well-formed index.json carries, and shall use it both to write the index at init and to measure a project in `templates check`.
append-requirement unwanted: The system shall not scaffold a project that immediately reports a pending template update.
append-criterion [verified] A freshly initialised tree needs zero `templates update` operations and passes `templates check` — verified by `packages/doctrina-cli/test/integration.test.js`.
append-criterion [verified] `init` writes every artifact category the schema declares, stamped with the running CLI version — verified by `packages/doctrina-cli/test/integration.test.js`.
```
