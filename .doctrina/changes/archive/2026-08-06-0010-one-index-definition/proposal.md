# Change 0010-one-index-definition — One definition of a correct index.json

- **Status:** applied
- **Applied:** 2026-08-06
- **Date:** 2026-08-06
- **Owner:** audit remediation v2
- **Affects specs:** templates

## Why

Audit item C5, reproduced on a packed install: `doctrina init` followed by
`doctrina templates update` reported a pending change on a project seconds
old — "add empty artifact category contracts". Every project was born
needing a scaffold update.

Two definitions of a correct `index.json` existed and nothing compared
them: the one `init` materialised from `index.json.template`, and the one
`templates check` required.

## What

- `lib/index-json.js` exports `ARTIFACT_CATEGORIES` — the one definition.
  `blank()` builds its artifact map from it; `templates check` and
  `templates update` measure against it.
- `init` writes `index.json` from `blank()` rather than from the template
  file, so the scaffold cannot drift from the schema.
- Tests: a freshly inited tree needs zero `templates update` operations,
  and carries every declared category with the running framework stamp.

## Scope boundaries

- `index.json.template` stays in the shipped tree (the templates spec
  inventories it) but no longer defines the scaffold's content.
- The on-disk format is unchanged, so no migration is needed: an existing
  project missing `contracts` is still healed by `templates update`.

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
