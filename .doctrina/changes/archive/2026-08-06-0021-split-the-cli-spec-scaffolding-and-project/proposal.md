# Change 0021-split-the-cli-spec-scaffolding-and-project — Split the cli spec: scaffolding and project maintenance become their own capability

- **Status:** applied
- **Applied:** 2026-08-06
- **Date:** 2026-08-06
- **Owner:** audit remediation v2
- **Affects specs:** cli, scaffolding cli

## Why

Split the cli spec: scaffolding and project maintenance become their own capability

## What

- **Deduplicated** 9 requirements and 6 acceptance criteria — artefacts of
  `change apply` not being idempotent when a delta is re-applied.
- **Split** along the seam the spec's own Purpose already named: the
  commands that materialise and maintain a project (`init`, `adapter`,
  `templates`, `hooks`, `index`, `upgrade`, `watch`, `metrics`,
  `completion`) become the `scaffolding` capability. 30 requirements and 4
  acceptance criteria moved VERBATIM.
- Both specs point at each other in Purpose and Out of scope, so no fact
  lives in two files.

486 → 431 lines for `cli`, 206 for `scaffolding`, and every capability
pack in the repository fits the default budget.

## Scope boundaries

- No requirement was rewritten while moving. One change, one intent — the
  cap is a reading budget, not permission to lose the contract.
- `cli` remains over its soft cap. A second seam exists (the surface
  contract vs the authoring commands) and is left for its own change rather
  than compounded into this one.

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
