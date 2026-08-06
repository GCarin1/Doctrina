# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

Audit item M4, ADR 0022. `doctrina context cli` was 23 files and ~37,900
tokens; 20 accepted ADRs were ~26,200 of them, 69% of the pack, none of it
selected for the task. ADRs are immutable and never retire, so the pack grew
with the project's age rather than with the task.

```ops
bump-version minor
set-header Last updated: 2026-08-06
append-requirement ubiquitous: The system shall assemble a context pack within a token budget, resolved as the --budget flag, then the project's index.json config.context_budget, then a built-in default.
append-requirement state: While a pack exceeds its budget, the system shall reduce accepted ADRs to title plus summary, and unnamed capability specs to title plus purpose, least relevant first, before omitting any artifact.
append-requirement ubiquitous: The system shall treat an ADR with no Scope: header as global, including it in every capability pack, and shall include a scoped ADR only in the packs of the capabilities it names.
append-requirement event: When the pack's irreducible core alone exceeds the budget, the system shall report which artifacts cannot be reduced and exit 1 rather than return a pack over budget.
append-requirement event: When a task description is supplied via --for, the system shall rank artifacts by term coverage and density rather than by document length.
append-requirement unwanted: The system shall not silently omit an artifact from a pack; every degradation and omission shall be named in the report.
append-criterion [verified] Every capability pack in this repository fits the default budget, and `context cli` is under 15,000 tokens (was ~37,900) — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
append-criterion [verified] A tighter budget never yields a bigger pack, and a budget the core cannot meet exits 1 with an explanation — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
append-criterion [verified] Degradation order is deterministic: the same tree and budget produce the same pack, everything degrades before anything drops, and the core is never touched — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
append-criterion [verified] An ADR with no Scope: header appears in every scoped pack, and a scoped one appears only where it governs — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
append-criterion [verified] A pre-change tree with no config block reads, rebuilds, and packs unchanged — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
```
