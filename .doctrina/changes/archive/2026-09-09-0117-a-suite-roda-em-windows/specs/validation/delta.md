# Spec Delta — capability: validation

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/validation/spec.md`

---

The suite has to run where the work happens. On a Windows checkout 519 of
this repository's 730 versioned files arrive CRLF — it declares no
line-ending policy — and nine test files assumed LF. So the local gate did
not run on the machine the work was being done on, and no change attested
to anything there.

The sharper half of the finding is not the terminators. Three of those
files performed a fixture edit with a `\n`-anchored pattern that matched
nothing, and then asserted against the result: a spec that was never
emptied, headings that were never renamed. The tests were green about a
setup that had silently not happened. A fixture that transforms something
must be held to having transformed it, exactly as `apply` is.

```ops
append-requirement ubiquitous: The system's own test suite shall read and compare artifacts independently of line terminators, so a checkout that stores them as CRLF runs the same gate as one that stores them as LF.
append-requirement unwanted: The system's tests shall not assert against a fixture transformation without first establishing that the transformation occurred, so a pattern that matches nothing fails rather than passing quietly.
append-criterion [verified] The nine repaired files pass on a CRLF checkout, and no file under `src/` is changed to make them — verified by `packages/doctrina-cli/test/a-recommendation-states-its-cost.test.js`.
append-criterion [verified] A fixture that renames the recommended headings is held to having renamed them, so the case cannot measure its own no-op — verified by `packages/doctrina-cli/test/a-recommendation-states-its-cost.test.js`.
append-criterion [verified] The repository root a test builds from resolves on Windows as well as on POSIX — verified by `packages/doctrina-cli/test/check-docs.test.js`.
bump-version minor
```
