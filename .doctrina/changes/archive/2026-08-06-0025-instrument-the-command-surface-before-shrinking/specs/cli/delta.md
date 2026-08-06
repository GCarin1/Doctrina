# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

Audit item M8, first half. The surface is 36 commands and 59 operations, and
the charge is that some exist because they were easy to add rather than
because anyone reaches for them. Deciding that from the outside is guessing —
and guessing nearly cut `prime`, `handoff` and `doctor` in 0.13.0, right
before the operator review found they had gone unused only because AGENTS.md
never named them.

```ops
bump-version minor
set-header Last updated: 2026-08-06
append-requirement ubiquitous: The system shall record which operation ran only when the operator names a log file, shall record the operation alone and never its arguments, and shall make no network call.
append-requirement event: When recording a usage sample fails for any reason, the system shall continue and report the command's own result unchanged.
append-requirement event: When `doctrina metrics --commands` runs, the system shall report the operations invoked and the catalog operations never invoked in that sample.
append-criterion [verified] No usage file appears unless DOCTRINA_USAGE_LOG names one, and no argument, path, id or prompt reaches the log — `packages/doctrina-cli/test/usage.test.js`.
append-criterion [verified] An unwritable log target does not throw and does not change the command's exit code — `packages/doctrina-cli/test/usage.test.js`.
append-criterion [verified] A sub-operation is recorded only when the catalog carries it, so a capability argument is not mistaken for one — `packages/doctrina-cli/test/usage.test.js`.
```
