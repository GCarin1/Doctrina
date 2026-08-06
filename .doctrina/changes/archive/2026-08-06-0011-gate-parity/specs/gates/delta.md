# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

Audit item C6, ADR 0017. `analyze` exited 1 on a change and `change apply`
mutated it anyway and exited 0 — through the analyze → apply path the
README flowchart prescribes. Preconditions now attach to the transition
and are declared once, so the answer does not depend on the route taken.

```ops
bump-version minor
set-header Last updated: 2026-08-06
append-requirement ubiquitous: The system shall declare in one place which gates guard which lifecycle transition, and every command that drives a transition shall consult that declaration rather than implementing its own preconditions.
append-requirement event: When `doctrina change apply` runs on a change whose structural checks fail, the system shall refuse, name the blocking gate and the command that clears it, and write nothing.
append-requirement event: When a lifecycle transition is forced with `--force`, the system shall proceed past the precondition, name the waived blockers, and record the gap in the archive ledger, creating the ledger when it does not yet exist.
append-requirement unwanted: The system shall not evaluate a gate at a transition where its question is not meaningful; the structural gate asks whether a change is safe to apply, so archiving shall not re-ask it.
append-criterion [verified] Every lifecycle transition is guarded identically regardless of which command drives it, enumerated by a table-driven suite — verified by `packages/doctrina-cli/test/gate-parity.test.js`.
append-criterion [verified] A refused transition mutates nothing, and a forced one records the waived blockers in the ledger — verified by `packages/doctrina-cli/test/gate-parity.test.js`.
```
