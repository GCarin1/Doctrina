# Change 0001-review-followups — review 0.11.0 follow-ups: ops-block docs, scoped close, clarify i18n, live provenance, evidence teeth, project upgrade command

- **Status:** applied
- **Applied:** 2026-07-12
- **Date:** 2026-07-12
- **Owner:**
- **Affects specs:** cli

## Why

review 0.11.0 follow-ups: ops-block docs, scoped close, clarify i18n, live provenance, evidence teeth, project upgrade command

## What

Implements the fixes and features from the external 0.11.0 field review
(project session 2026-07-12, changes 0050–0058): close the mechanical-delta
gap (ops-block docs + ADDED fallback), scope `close`'s coverage gate to the
change's capabilities, make `clarify` Portuguese-aware with inline
suppression, live intent provenance (`intent add`), machine-readable spec
links (`Depends on:`), lintable project rules, executable evidence
(`coverage --run`), `work` ergonomics (word-boundary slug, `--title`, close
+ ADR checkpoint in the playbook), `skill suggest` dedup, three papercuts,
and a new `upgrade` command that brings an existing project up to the
installed CLI after an npm update.

## Scope boundaries

- No semantic fidelity judgement anywhere (ADR 0005/0006 ceiling stands).
- No interactive `delta preview` (superseded by ops-block docs + ADDED
  fallback; revisit only if manual merges persist).
- `coverage --run` executes only what the project declares as its
  `evidence_runner`; the CLI never guesses a test runner.

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

<!-- List unresolved decisions. Empty if none. -->
