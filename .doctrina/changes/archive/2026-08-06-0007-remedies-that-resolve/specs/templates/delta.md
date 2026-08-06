# Spec Delta — capability: templates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/templates/spec.md`

---

Audit item C2. A clean `init --agent claude` failed `templates check` on
four Claude and four Cursor slash-command shims, and neither suggested
remedy could clear it. The check was wrong, not the templates: a shim
invokes the CLI and reaches the hub through its parent pointer file.
Which files are pointers is now declared by the template itself, through
the `AGENTS_MD_PATH` token.

```ops
bump-version minor
set-header Last updated: 2026-08-06
append-requirement ubiquitous: The system shall treat an adapter file as a hub pointer only when its template declares the AGENTS_MD_PATH token; slash-command shims reach the hub through their parent pointer file and shall not be required to name it.
append-requirement event: When `doctrina templates check` reports a finding, the system shall name the command that resolves that finding, or state that repair is manual.
append-requirement unwanted: The system shall not name a remedy that cannot resolve the finding it is attached to.
append-criterion [verified] A fresh `doctrina init --agent <name>` passes `templates check` for every bundled adapter — verified by `packages/doctrina-cli/test/remedies.test.js`.
append-criterion [verified] Every finding's printed remedy, executed verbatim, clears that finding — verified by `packages/doctrina-cli/test/remedies.test.js`.
```
