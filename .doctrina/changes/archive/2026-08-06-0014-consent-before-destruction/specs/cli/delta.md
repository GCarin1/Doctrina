# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

Audit item C9. `change abandon` deleted work with no prompt, no preview,
and no `--force` requirement; the ledger line is good practice and is not
a substitute for consent. Separately, `init`'s description prompt ignored
the TTY check its sibling adapter prompt already had.

```ops
bump-version patch
set-header Last updated: 2026-08-06
append-requirement event: When `doctrina change abandon` runs without `--force`, the system shall list the files it would delete, state that the deletion cannot be undone, and require confirmation; off a terminal it shall refuse rather than proceed.
append-requirement event: When `doctrina init` has no project description and no terminal to ask on, the system shall refuse and name the flags that supply one, rather than scaffolding with an empty description.
append-requirement unwanted: The system shall not treat a non-interactive stdin as consent for a destructive operation.
append-criterion [verified] `change abandon` without confirmation deletes nothing and names the non-interactive escape; `init` without a description scaffolds nothing — verified by `packages/doctrina-cli/test/integration.test.js`.
append-criterion [verified] No mutating command alters authored `AGENTS.md` or `product.md` content, and `intent add`, whose contract is to append an anchor, preserves every authored line — verified by `packages/doctrina-cli/test/integration.test.js`.
```
