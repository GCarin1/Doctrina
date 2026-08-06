# Spec Delta — capability: templates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/templates/spec.md`

---

Audit item C4. `templates update` appended the surface block instead of
placing it, so one CLI produced two layouts: third section after `init`,
last section after `upgrade` — behind everything the agent reads first,
and with no heading of its own, so a hierarchical parse read the command
surface as content of the section above it.

```ops
bump-version patch
set-header Last updated: 2026-08-06
append-requirement ubiquitous: The system shall define one canonical position for the doctrina:surface block, taken from the shipped AGENTS.md template, and shall use it for both `init` and `templates update`.
append-requirement event: When `templates update` inserts a missing doctrina:surface block, the system shall place it at the canonical position rather than appending it, and a second run shall change nothing.
append-requirement event: When `templates update` previews a doctrina:surface change, the system shall show the differing lines, or the block body and its destination, rather than a one-line summary.
append-criterion [verified] A fresh `init` and an `upgrade --write` of a block-less tree produce the same section order, and a second upgrade is a no-op — verified by `packages/doctrina-cli/test/integration.test.js`.
append-criterion [verified] The preview names the destination and shows the block content or the changed lines — verified by `packages/doctrina-cli/test/integration.test.js`.
```
