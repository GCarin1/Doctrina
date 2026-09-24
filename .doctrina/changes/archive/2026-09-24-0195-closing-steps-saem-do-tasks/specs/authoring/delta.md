# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

Aplicar, arquivar e indexar são o que o close faz, não caixas a marcar antes dele.

```ops
replace-requirement event 27: When `doctrina change archive <id>` runs, the system shall refuse (exit 1) while any checkbox in `tasks.md` or the proposal's `## Verification` section is unchecked — a legacy `## Closing steps` list excepted, since apply, archive and index are what the close does — unless `--force` is supplied, which archives and records the gap.
append-requirement ubiquitous: The system shall scaffold a change's `tasks.md` with implementation tasks only, and shall count its boxes through one counter that leaves out a legacy `## Closing steps` list, so no surface asks an agent to tick "apply", "archive" or "update the index" before the command that performs them has run.
append-criterion [verified] A scaffolded tasks.md carries no closing steps, `change tick` numbers the tasks and then the Verification claims, and the counter leaves a legacy `## Closing steps` list out while the grammar still sees its boxes — verified by `packages/doctrina-cli/test/one-box-count.test.js`.
bump-version minor
```
