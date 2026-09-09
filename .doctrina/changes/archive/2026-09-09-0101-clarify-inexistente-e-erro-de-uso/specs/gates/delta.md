# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

A path that does not exist is a wrong invocation, not a failed gate.
`clarify` returned the gate class for it, so an agent branching on the exit
code read "the work is not ready" and had every reason to retry an
invocation that never succeeds unchanged (ADR 0018).

It was the last straggler in a family that already agreed: `intake --file`,
`init --intake-file` and `templates check --path` all answer with the usage
class.

```ops
append-requirement event: When a gate command is given a path that does not exist, the system shall report a usage error rather than a gate failure, so a consumer does not retry an invocation that cannot succeed unchanged.
append-criterion [verified] `clarify` refuses a missing path with the usage class while still gating a real file, and every command taking a path answers a missing one identically — verified by `packages/doctrina-cli/test/retrieval-folds-and-refuses.test.js`.
bump-version patch
```
