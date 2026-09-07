# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

`next` answers "what now?" with records instead of prose. The action list
moves to `src/lib/actions.js`; `next`, `prime`, `handoff` and `watch`
render `text` from those records, and `next --run` executes the first
runnable one.

The `--json` payload changes shape: `actions` was an array of strings and
is now an array of records. That is the point of the change, and the
records carry `text` so the previous line is still available.

```ops
append-requirement event: When `doctrina next` runs, the system shall compute the recommended actions as records carrying a stable kind id, the operation and its arguments, the reason, the gate it clears, a severity, and whether it may be run unattended, and shall derive the printed line from those same fields.
append-requirement event: When `doctrina next --run` runs, the system shall execute the first runnable action in process and stop, exiting with that command's own code; when no action is runnable it shall name the action that requires a person and exit successfully.
append-requirement unwanted: The system shall not treat an action that requires a human decision — accepting a decision, completing a task, authoring a proposal or a skill — as runnable, however mechanical the resulting edit would be.
append-criterion [verified] An action carries the operation and its arguments, so a consumer re-issues it without parsing prose — verified by `packages/doctrina-cli/test/actions.test.js`.
append-criterion [verified] The lines printed by `next`, `prime` and `handoff` are unchanged by the move to records — verified by `packages/doctrina-cli/test/actions.test.js`.
append-criterion [verified] `--run` executes a runnable action and refuses one that needs a person, ticking and accepting nothing on the way past — verified by `packages/doctrina-cli/test/actions.test.js`.
bump-version minor
```
