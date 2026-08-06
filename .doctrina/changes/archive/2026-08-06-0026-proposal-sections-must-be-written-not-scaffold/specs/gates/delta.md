# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

`analyze` checked that `## Why` existed as a HEADING, never that anything
had been written under it. Six changes closed in one session with every
rationale section still holding its scaffold comment, and every gate green.

```ops
bump-version patch
set-header Last updated: 2026-08-06
append-requirement unwanted: The system shall not pass a change whose proposal carries a section holding only its scaffold comment; a heading that survived is not a section that was written.
append-criterion [verified] A freshly scaffolded change fails analyze naming each unwritten section, and passes once they carry prose — `packages/doctrina-cli/test/integration.test.js`.
```
