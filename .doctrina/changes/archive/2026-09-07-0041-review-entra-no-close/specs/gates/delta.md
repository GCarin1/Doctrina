# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

<!-- delta body below -->

The richest conformance analysis the project has was reachable only by
typing its name. This delta puts it in the sequence, at the point where its
findings can still change what gets written, and states the boundary that
keeps it honest: advisory means the close's result does not depend on it.

```ops
replace-requirement event 31: When `doctrina close <id>` runs, the system shall drive the closing sequence in one pass — analyze → review (advisory) → change apply → runtime → verify (skipped with a note when no `verify.json`) → coverage `--strict` → trace (advisory) → change archive → validate — stopping at the first failure with the exact command to rerun, and exit non-zero on that failure (review 2026-06-27).
append-requirement event: When `doctrina close <id>` reaches the review step, the system shall report the conformance breaks between the change and the spec tree before applying any delta, so a finding can still change what is written.
append-requirement unwanted: The system shall not let an advisory step decide a driver's exit code; a step declared advisory shall report and the sequence shall continue.
append-criterion [verified] The review runs before the apply, reports a capability whose code moved while its spec stood still, and leaves the close's exit code untouched — verified by `packages/doctrina-cli/test/integration.test.js`, `packages/doctrina-cli/test/gate-sequences.test.js`.
bump-version minor
```
