# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

Audit item C3. One global boolean list in the entrypoint served every
command, and six flags read via `flagBool` were absent from it. An
undeclared flag consumes the next token as its value, so the positional
was eaten AND the flag silently ignored — `change new --chore id "Title"`
reported "requires a title" for a quoted title. Declarations move to the
commands; a static test is the guard.

```ops
bump-version minor
set-header Last updated: 2026-08-06
append-requirement ubiquitous: The system shall declare each command's accepted flags in that command's own module, and shall parse an invocation in two passes — resolving the command name first, then re-parsing with that command's declared flags merged over the global set.
append-requirement ubiquitous: The system shall accept a declared flag in any position relative to the command's positional arguments, with identical results.
append-requirement unwanted: The system shall not read a flag a command has not declared, and shall not document an undeclared flag in a command's Options block.
append-criterion [verified] Every command declares a flag spec, every flag read is declared, and every flag documented in an Options block is declared — verified by `packages/doctrina-cli/test/flag-catalog.test.js`.
append-criterion [verified] A declared flag placed before the positionals behaves identically to one placed after — verified by `packages/doctrina-cli/test/flag-catalog.test.js`.
```
