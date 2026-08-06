# ADR 0017 — One gate map: preconditions belong to the transition, not the command

- **Status:** accepted
- **Date:** 2026-08-06
- **Deciders:** GCarini + agent session of 2026-08-06 (audit remediation v2)
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** `packages/doctrina-cli/src/lib/gates.js`, `packages/doctrina-cli/src/commands/change.js`
- **Landed:** 2026-08-06 — covered by the table-driven parity suite in `packages/doctrina-cli/test/gate-parity.test.js`

## Context

Every command decided its own preconditions. `change archive` checked
verification. `close` ran the whole sequence and stopped at the first
failure. `change apply` checked nothing at all.

The consequence, reproduced on a packed install: `doctrina analyze $ID`
exits 1 reporting an unplanned change, and `doctrina change apply $ID`
applies it anyway and exits 0. The same precondition was enforced on the
`close` path and unenforced on the `analyze` → `change apply` path — which
is the path the README flowchart and the work playbook both prescribe. An
agent following the documented flow could reach a state another documented
flow forbids.

The defect was not a missing `if` in `apply`. It was that "which gate
guards which transition" existed nowhere: it was an emergent property of
whichever command you happened to call.

## Decision

Preconditions attach to the **transition**, not to the command that drives
it, and are declared once in `src/lib/gates.js`.

1. `GATES` names each precondition (`structure`, `verification`) with the
   blockers it produces and the command that fixes them.
2. `TRANSITIONS` maps each lifecycle transition to the gates that guard it:
   `apply` → `structure`; `archive` → `verification`.
3. Every driver — `change apply`, `change archive`, `change check`,
   `close` — consults the map instead of implementing its own checks.
   `change check` previews through the same map, so the preview cannot
   disagree with the enforcement.
4. `--force` waives a precondition and records the gap in the archive
   ledger, creating the ledger if this is the first entry. Forcing waives
   the CHECK, never the operation: a forced `apply` past a structural
   blocker still fails if the delta genuinely cannot be parsed.

**A gate is asked only where its question is meaningful.** `archive`
deliberately does not require `structure`. The structure gate asks "is
this safe to apply?", and one of its checks is that an ADDED delta's
target does not already hold real content — which, after a successful
apply, it does, because the apply just wrote it. Asking that question at
archive time reports the proof of success as a conflict. Consistency means
the same question gets the same answer everywhere, not that every
transition asks every question.

## Alternatives considered

1. **Add an analyze call inside `apply`.** Rejected: it fixes the one
   reported instance and leaves the next command free to invent its own
   preconditions. The absence of a declaration was the defect.
2. **Make `close` the only supported path and deprecate the step-by-step
   commands.** Rejected: operators use the individual commands
   deliberately, to keep control at each step, and the field reviews show
   they will keep doing so. The steps have to be safe, not discouraged.
3. **Gate `archive` on structure too, for symmetry.** Tried, and it broke:
   see the paragraph above. Symmetry of questions is not the goal;
   symmetry of answers is.

## Consequences

**Positive**

- An agent cannot reach a state through one path that another path
  forbids.
- Adding a transition or a gate is a change to one declaration, and the
  table-driven test enumerates every pair.
- Refusals name the gate that blocked them and the command that clears it.

**Negative**

- `change apply` is stricter than before: a change whose tasks were never
  planned is refused where it previously applied. This is the intended
  behaviour, but it is a behaviour change for anyone scripting `apply`
  over unplanned changes — `--force` is the escape hatch.
- The `structure` gate runs `analyze`'s checks on every apply, which
  re-reads the change folder. The cost is negligible at Doctrina's scale
  and has not been optimised.

**Neutral**

- `close` is unchanged in behaviour: it already ran analyze first, so it
  satisfied the map before the map existed.
