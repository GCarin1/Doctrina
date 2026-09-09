# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

Open changes leave the irreducible core of the context pack. They were
never degraded and never dropped, so the SIZE OF THE BACKLOG decided
whether the read path worked at all: twenty planned-but-unstarted changes
took this repository's own packs from 95% of the ceiling to 230% of it,
`doctrina context <cap>` exited 1, and the CI budget gate went red.

Exactly one change is in focus and stays whole; every other open change is
one degradable queue line carrying its status, its Why, its task progress
and the specs it will move. Focus is singular by construction and never
guessed — a tie means no focus, and the queue is the honest answer.

The same unambiguous-leader rule promotes the spec a `--for` query points
at into the core, which is what "the task's capability" has always meant
when the capability is named directly.

```ops
append-requirement state: While a change is open but not in focus, the system shall carry it in the context pack as a single degradable entry stating its status, its rationale, its task progress and the capabilities its deltas target.
append-requirement event: When a context pack is assembled, the system shall place at most one open change in the irreducible core — the one the named capability or the task query identifies unambiguously — and shall place none there when several match equally.
append-requirement event: When a task query is given and no capability is named, the system shall place the spec that query identifies unambiguously in the irreducible core.
append-requirement unwanted: The system shall not let the number of open changes decide whether a context pack can be assembled within its budget.
append-criterion [verified] A backlog of twenty open changes leaves every capability pack within the default budget, and each change is still present — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
append-criterion [verified] The change in focus keeps its proposal, tasks and deltas whole while every parked change is a single entry — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
append-criterion [verified] Several changes matching equally leaves none in focus, so the pack never silently decides what the reader is working on — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
bump-version minor
```
