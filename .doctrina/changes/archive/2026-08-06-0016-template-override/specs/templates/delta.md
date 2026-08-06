# Spec Delta — capability: templates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/templates/spec.md`

---

Audit item M1, ADR 0019. `doctrina init` created `.doctrina/templates/` in
every project and nothing ever read it: resolution answered only "where
did the CLI install its templates?". The directory the framework names
after the thing users most want to customise was inert.

```ops
bump-version minor
set-header Last updated: 2026-08-06
append-requirement ubiquitous: The system shall resolve every template through a chain, per file: a template under the project's `.doctrina/templates/` wins, and anything absent falls back to the copy shipped with the installed CLI.
append-requirement event: When a scaffolding command uses a project template rather than the bundled one, the system shall say so.
append-requirement event: When `doctrina templates list` runs, the system shall label each template with the source it resolved from and mark a project file that shadows a bundled one.
append-requirement unwanted: The system shall not require a project to vendor the whole template tree in order to override one file.
append-criterion [verified] A project-local template overrides the bundled one and its tokens still substitute, while a template with no local override falls back — verified by `packages/doctrina-cli/test/integration.test.js`.
append-criterion [verified] An empty project templates directory behaves exactly as before the chain existed — verified by `packages/doctrina-cli/test/integration.test.js`.
```
