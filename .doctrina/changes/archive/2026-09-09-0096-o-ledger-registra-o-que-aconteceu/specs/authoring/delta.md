# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

The ledger records what happened, not what was attempted. A forced gap was
written at the moment the gate was overridden — before the transition ran,
and often for one that never occurred: `change apply --force` on a change
whose ops block cannot apply logged "forced apply past 3 blockers" while it
wrote nothing, left the target spec byte-identical and left the proposal
`proposed`.

The ledger is the readable source of what happened to the tree. An attempt
that changed nothing did not happen to it, and a history that says otherwise
is worse than one that says nothing.

`--force` still waives the precondition and not the operation: a forced
apply still fails on the same malformed delta. That is the honest split —
the gate promises what is checked before starting, never that the work will
succeed.

```ops
append-requirement event: When a lifecycle transition is forced past its gates, the system shall record the waived blockers in the change ledger only after that transition has actually taken effect.
append-requirement unwanted: The system shall not record a forced transition that wrote nothing, so the ledger never claims an event that did not occur.
append-criterion [verified] A forced apply that fails claims nothing in the ledger, and the target spec and proposal prove nothing happened — verified by `packages/doctrina-cli/test/the-ledger-records-what-happened.test.js`.
append-criterion [verified] A forced apply that succeeds is still recorded, naming the gate it waived, and a forced archive is recorded only once the folder has moved — verified by `packages/doctrina-cli/test/the-ledger-records-what-happened.test.js`.
append-criterion [verified] Recording follows the outcome across every gated transition, not the override — verified by `packages/doctrina-cli/test/gate-parity.test.js`.
bump-version minor
```
