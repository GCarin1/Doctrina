# Change 0016-template-override — Project templates are a real override point, not a ghost directory

- **Status:** applied
- **Applied:** 2026-08-06
- **Date:** 2026-08-06
- **Owner:** audit remediation v2
- **Affects specs:** templates

## Why

Audit item M1. `doctrina init` creates `.doctrina/templates/` containing a
single `.gitkeep`, and nothing ever read it or wrote to it.
`locateTemplatesDir()` resolved against the CLI installation only, and
`templates list` said as much: "Templates shipped by the installed Doctrina
CLI". The framework created a directory in every adopting project, named
after the thing users most want to customise, and left it a ghost.

## What

- `lib/templates.js`: `resolveTemplate` / `readTemplate` /
  `listResolvedTemplates` — a per-file chain, project over bundled.
- `spec new`, `skill new`, `decision new`, `contract new` read through the
  chain and report `(project template)` when the override was used.
- `templates list` prints the resolved source per entry and marks a project
  file that shadows a bundled one.
- ADR 0019; tests for override, per-file fallback, and the
  empty-directory-is-unchanged guarantee.
- Docs: new `templates.md` (EN+PT, sidebar-linked) covering the chain, what
  is safe to override, and the pinning trade-off.

## Scope boundaries

- Per FILE, not per directory: overriding one template must not mean
  vendoring and maintaining the whole tree.
- No staleness check for an overridden template yet — the trade-off is
  documented rather than tooled.
- `init`'s own skeleton materialisation still reads the bundled tree
  directly: at init time there is no project to override from.

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
