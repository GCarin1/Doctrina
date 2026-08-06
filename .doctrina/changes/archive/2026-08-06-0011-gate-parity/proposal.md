# Change 0011-gate-parity — One gate map: every lifecycle transition is guarded identically

- **Status:** applied
- **Applied:** 2026-08-06
- **Date:** 2026-08-06
- **Owner:** audit remediation v2
- **Affects specs:** gates

## Why

Audit item C6. `doctrina analyze $ID` exited 1 and `doctrina change apply
$ID` applied the same change anyway and exited 0, while the two
neighbouring gates (`change archive`, `close`) both refused correctly. So
one precondition was enforced or not depending on which command drove the
transition — and the unenforced route is the one the README flowchart and
the work playbook prescribe.

The defect was not a missing check in `apply`. It was that "which gate
guards which transition" was an emergent property of whichever command you
called, rather than something the framework declared.

## What

- `lib/gates.js`: `GATES` (structure, verification) and `TRANSITIONS`
  (apply → structure; archive → verification), plus `checkTransition` and
  `recordForcedGap`.
- `analyze` exports `collectAnalysis` so the structure gate and the
  command report the same findings.
- `change apply` / `change archive` / `change check` all consult the map;
  `check` previews through it, so preview and enforcement cannot disagree.
- ADR 0017; table-driven parity suite; docs EN+PT.

**A correction made while building this.** The first version gated
`archive` on structure as well, for symmetry. That was wrong and the
tests caught it: the structure gate's ADDED-target check asks whether it
is safe to apply, and after a successful apply the target holds exactly
what the delta wrote — so archiving reported the proof of success as a
conflict. A gate is asked only where its question is meaningful.

## Scope boundaries

- `close`'s behaviour is unchanged: it already ran analyze first, so it
  satisfied the map before the map existed.
- The docs gate (D2) stays inside `close` rather than joining the
  transition map: it guards the close as a whole, not a single artifact
  transition.
- `--force` semantics are unchanged for archive; apply gains the same.

## Verification

<!--
How you will know the change is correctly applied. Use checkboxes: every
box here is a claim that must be PROVEN before the change is done.
`doctrina change archive` refuses to archive while any box below is
unchecked (pass --force to archive anyway and record the gap). Distinguish
"task marked done" from "verification passed" — link the evidence.
-->

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

None.
