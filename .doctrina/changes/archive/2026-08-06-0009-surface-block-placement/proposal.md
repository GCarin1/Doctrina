# Change 0009-surface-block-placement — Surface block has one canonical position, for init and upgrade alike

- **Status:** applied
- **Applied:** 2026-08-06
- **Date:** 2026-08-06
- **Owner:** audit remediation v2
- **Affects specs:** templates

## Why

Audit item C4. The same CLI produced two different AGENTS.md layouts: on a
fresh `init` the surface block is the third section; after `upgrade` on a
pre-0.13 tree it landed last, behind 117 lines the agent reads first —
the attention problem design principle #2 exists to prevent. It was also
appended after "## What never goes in this file" with no heading of its
own before it, so a hierarchical parse read the command surface as
content of that section.

`upgrade`'s orchestration was correct; only placement was wrong.

## What

- `surfaceAnchors(template)` derives the canonical position from the
  shipped template — the only place the intended layout exists.
- `placeSurfaceBlock(text, block, anchors)` inserts there, falling back
  to the following heading, then to appending.
- `templates update` places instead of appending, and previews a real
  diff (changed lines for a stale block; body plus destination for a
  missing one).
- Docs EN+PT: the canonical position, idempotency, and the preview.

## Scope boundaries

- A legacy hand-written surface section is still replaced in place: it
  already sits where the CLI put it, so moving it would be gratuitous.
- What the block CONTAINS is unchanged here; adding purpose/when triggers
  to it is M2.

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
