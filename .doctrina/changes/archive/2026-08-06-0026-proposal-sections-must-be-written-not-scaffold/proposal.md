# Change 0026-proposal-sections-must-be-written-not-scaffold — Proposal sections must be written, not scaffold

- **Status:** applied
- **Applied:** 2026-08-06
- **Date:** 2026-08-06
- **Owner:**
- **Affects specs:** gates

## Why

Six changes closed in this session with every rationale section empty, and
nothing objected. `analyze` verified that `## Why` existed as a HEADING;
it never looked underneath. The planning scripts had written to CRLF files
with LF patterns, so the single-line header replacements landed and every
prose section silently kept its scaffold comment.

For a framework whose premise is recoverable provenance, an archived change
that cannot say why it happened is the defect — and this one shipped six of
them past its own gates.

## What

- `analyze` now reports every proposal section whose body is empty once
  comments are stripped, and names them.
- The six affected proposals were backfilled with the rationale they were
  meant to carry.

The check is deliberately about EMPTINESS rather than about the specific
scaffold text: a section emptied by hand is no more written than one that
still holds its comment.

## Scope boundaries

- Proposals only. `tasks.md` already had its own placeholder check, and
  specs are covered by `validate`'s shape checks.
- No check that the prose is any GOOD. A gate can tell that a section was
  written; whether it says anything is a reader's judgement.

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

