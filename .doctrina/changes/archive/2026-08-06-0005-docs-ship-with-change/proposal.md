# Change 0005-docs-ship-with-change — Docs ship inside the change, never after it

- **Status:** applied
- **Applied:** 2026-08-06
- **Date:** 2026-08-06
- **Owner:** audit remediation v2
- **Affects specs:** gates

## Why

Audit item D2. D1 made documentation mechanically checkable; nothing made
it required. A change could add a flag, rename another, and close green
with no page describing either — and a docs phase scheduled after the work
never happens.

## What

- `lib/docs-impact.js`: the two deterministic halves — which documented
  surfaces a change touches (read from its own proposal and deltas, with
  the scaffold's boilerplate subtracted) and whether documentation moved
  (read from git: working tree plus branch commits against the default
  branch).
- `close` gains a blocking `docs` step between trace and archive, with the
  `--force` escape hatch and a ledger line recording the gap.
- Tests: detection unit tests, plus end-to-end refusal, forced close with
  a ledger gap, the docs-satisfied path, and the quiet path.
- Docs: `cli-reference.md` and `flow.md`, EN and PT.

## Scope boundaries

- The gate asks whether documentation moved, never whether it is correct;
  correctness is D1's job.
- Outside a git repository the gate stays silent rather than accusing.
- Folding this gate into the shared gate-to-transition map is C6.

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
