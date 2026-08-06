# Change 0004-docs-accuracy-gate — Docs accuracy gate: check truth, not only shape

- **Status:** applied
- **Applied:** 2026-08-06
- **Date:** 2026-08-06
- **Owner:** audit remediation v2
- **Affects specs:** docs

## Why

Audit item D1. `scripts/check-docs.js` checked five properties of docs and
every one was about layout: filename parity, one H1, a line cap, a source
note, README links. None was about accuracy. A page could document a
command that no longer exists, a flag that was renamed, or an exit code
whose meaning changed, and `doctrina verify` stayed green.

This lands first, before the corrections, so that every subsequent change
in the remediation carries its own documentation instead of leaving a
cleanup phase that never happens.

## What

- `scripts/check-docs.js` gains five accuracy checks beside the five shape
  checks: command resolution, flag declaration, link resolution,
  output-block marking, EN/PT length ratio.
- `src/lib/flag-catalog.js`: the shared "which flags does command X accept"
  catalog. Two consumers by design — this gate and the C3 source test.
- `runChecks(root)` is exported so a fixture tree can prove each check
  fires; the script self-executes only when invoked directly.
- `test/check-docs.test.js`: one test per check, each seeding the violation
  it detects, plus the negative cases (a real command in prose, an
  invocation-only block, a docsify route, a fenced sample link).
- `lib/spec-ops.js`: fixes a content-corruption defect this change exposed.
  `matchOpsBlock` skipped an example ops block inside the delta template's
  instructional comment by DELETING every comment from the delta first,
  which gutted any op value legitimately containing a comment — this
  change's own `<!-- illustrative -->` criterion reached the spec empty.
  The comment is now skipped by position; the op value survives verbatim.

## Scope boundaries

- The flag check is scoped to `cli-reference.md` flag tables, where
  attribution to a command is structural. Prose mentions elsewhere are not
  attributable without guessing and stay out.
- Commands that do not yet export a flag spec are counted and skipped, so
  this lands independently of C3; C3 makes the check total.
- Generating `cli-reference.md` is D3, not this change.

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
