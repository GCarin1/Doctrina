# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

Two defects in what 0.15.0 shipped: RT02 advised recording a rename the
artifact could not express, and an expectation withheld output it only
needed to read.

```ops
append-requirement optional: Where a wiring row declares its source as `<origin>:<source>`, the system may treat an export reading that source as intended and report no name mismatch, while still reporting an origin mismatch as an error.
append-requirement ubiquitous: The system shall stream the output of a check declaring an output expectation as it arrives, while accumulating a copy for the match — reading a check's output shall not withhold it.
append-criterion [verified] A wiring row declaring `<origin>:<source>` silences the name-mismatch warning while the workflow agrees, and warns again when either side moves — verified by `packages/doctrina-cli/test/runtime.test.js`.
append-criterion [verified] Declaring a source does not switch off the empty-vs-unset check for that row — verified by `packages/doctrina-cli/test/runtime.test.js`.
append-criterion [verified] A check with an output expectation emits its output progressively rather than in one block at the end — verified by `packages/doctrina-cli/test/runtime-commands.test.js`.
bump-version patch
```
