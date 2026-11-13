# Change 0263-release-0-22-1 — Release 0.22.1

- **Status:** applied
- **Applied:** 2026-11-13
- **Documented surface:** n/a — a patch release stamps versions only; no command, flag or output changes
- **Date:** 2026-11-13
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain) — opened as chore
- **Affects specs:** none


## Why

0.22.0 is on npm, but main carries three fixes since: the Release workflow that a tag push re-ran into E409, the typecheck that a TypeScript 7 bump turned red, and an index entry that parallel `doctrina work` runs lost under load. The maintainer asked for them as a patch release with its own tag.

## What

Stamp 0.22.1 with `scripts/release.mjs`: package.json and lockfile, AGENTS.md's changed block, the three READMEs, SECURITY.md and every index's framework_version; the Unreleased CHANGELOG content moves under [0.22.1]. AGENT_CHANGELOG gets an empty 0.22.1 entry, since nothing an agent does changes.

## Scope boundaries

Version stamps and the changelog only. No behaviour changes in this change; the fixes it ships were committed and closed before it (0262 and two direct fixes).

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

Nenhuma.

<!-- doctrina:applied-deltas none -->
