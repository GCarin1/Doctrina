# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

`doctor` reported every template failure as "recommended sections/fields
are missing" and sent the user to `templates update`, which does not
touch adapters and could never clear an adapter-pointer finding.

```ops
bump-version patch
set-header Last updated: 2026-08-06
append-requirement event: When `doctrina doctor` reports the template row, the system shall describe the actual findings and name the remedy those findings carry, rather than assuming a missing recommended section.
append-criterion [verified] An adapter-pointer finding is reported by `doctor` with the remedy that resolves it, and is not labelled a missing section — verified by `packages/doctrina-cli/test/remedies.test.js`.
```
