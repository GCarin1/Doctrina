# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

The pre-flight now runs the ops. `analyze` reported "ready to apply" for a
delta whose ops block `apply` then refused: it inspected the delta's header,
its target and its shape, and never the one part that does the work.

`change check` already ran this dry-run, so the answer existed — the gate
that `apply` and `close` consult was simply not the one asking. Moving it
into `collectAnalysis` is what makes the three agree, rather than adding a
second implementation beside the first.

The finding is scoped `pre-apply`. After a successful apply the target holds
exactly what those ops wrote, so re-running them against it is a question
with no meaning; `archive`'s integrity gate excludes that scope for the same
reason it excludes the ADDED-target check.

```ops
append-requirement event: When a change is analyzed, the system shall execute each MODIFIED delta's ops block against its target spec in memory and report an op that would fail at apply time, so the pre-flight refuses exactly what the apply refuses.
append-requirement state: While a MODIFIED delta carries no ops block, the system shall report it as a manual merge rather than a failure, since apply writes nothing and prints a merge pointer for it.
append-requirement unwanted: The system shall not re-execute a change's ops block once the change is applied, since the target then holds what those ops wrote and the question has no meaning.
append-criterion [verified] `analyze` refuses an ops block that `apply` would refuse, and names the offending op — verified by `packages/doctrina-cli/test/the-preflight-runs-the-ops.test.js`.
append-criterion [verified] The refusal reaches `apply` through the structure gate, not only through `analyze`'s own rendering — verified by `packages/doctrina-cli/test/the-preflight-runs-the-ops.test.js`.
append-criterion [verified] A MODIFIED delta with no ops block still passes, and an applied change still archives — verified by `packages/doctrina-cli/test/the-preflight-runs-the-ops.test.js`.
bump-version minor
```
