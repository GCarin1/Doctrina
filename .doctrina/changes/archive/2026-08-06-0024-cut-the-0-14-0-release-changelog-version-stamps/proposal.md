# Change 0024-cut-the-0-14-0-release-changelog-version-stamps — Cut the 0.14.0 release: changelog, version stamps, and a gate that keeps them honest

- **Status:** applied
- **Applied:** 2026-08-06
- **Date:** 2026-08-06
- **Owner:** audit remediation v2
- **Affects specs:** (none — chore)

## Why

Cut the 0.14.0 release: changelog, version stamps, and a gate that keeps them honest

## What

- The 0.14.0 changelog entry, organised Added / Changed / Fixed.
- Every `**Status:** vX.Y.Z` stamp reconciled to the package version.
- **A gate so this is the last time.** The `cut-a-release` skill lists
  reconciling the stamps as a manual step, and notes they had already
  drifted once before (fixed by hand in 0.10.0). A manual step that has
  been skipped twice is a gate that does not exist yet: `check-docs.js`
  check 13 now compares every stamp to `package.json`.

## Scope boundaries

- No publish and no tag. The tarball is built and verified by the packed-
  install harness; `npm publish` stays a deliberate human action.
- The 0.14.0 work has been landing in incremental commits
  (`0a278b4`..`fc6359b`) with the remainder in the working tree. Sequencing
  the release commit is the operator's call, not this change's.

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
