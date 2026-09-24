# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

`validate` classifies findings as errors or warnings and has always
exited on errors alone. That default is right for a human at a terminal:
a warning is advice, and advice that blocks a commit stops being read.

It is wrong for a caller whose whole job is to reprove. The CI step that
validates the shipped examples runs `validate`; both examples drifted to
warnings; the step reported green through every run for weeks, while the
EARS defect that the retrofit example exists to teach against sat in it
for the second time.

The verdict becomes the caller's to ask for, under the name the tree
already uses for it — `coverage --strict` and `trace --strict` both mean
"fail on any gap".

```ops
bump-version minor
set-header Last updated: 2026-09-11
append-requirement event: When `doctrina validate` runs with `--strict`, the system shall count every warning as a failure and exit 1, and shall name `--strict` as the cause when it found no error.
append-criterion [verified] `validate --strict` exits 1 on a tree whose only finding is a warning, exits 0 on a tree with nothing to say, and reports the mode it ran in under `--json` — verified by `packages/doctrina-cli/test/integration.test.js`.
```
