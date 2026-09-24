# Spec Delta — capability: insight

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/insight/spec.md`

---

O digest do período tem um nome só: `status --view report`.

```ops
replace-requirement event 12: When `doctrina status --view report [--since <days>]` runs, the system shall print a Markdown digest for the window (default seven days) — gate state, changes archived in the window from the index ledger, open work with task progress, artifact counts, and a local-git summary with the window's metrics that degrades silently outside a repository — read-only, with no network; the deprecated `doctrina report` shall print the same bytes from the same collector, and `--view agent-changelog` shall print the draft `report --agent-changelog` printed.
append-criterion [verified] In a repository with history, `status --view report` prints what `report` printed, rates included, `status --view agent-changelog` prints what `report --agent-changelog` printed, and `report` still works while warning on stderr — verified by `packages/doctrina-cli/test/o-digest-tem-um-nome-so.test.js`.
bump-version minor
```
