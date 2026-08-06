# Change 0014-consent-before-destruction — Destructive and interactive paths ask, or refuse

- **Status:** applied
- **Applied:** 2026-08-06
- **Date:** 2026-08-06
- **Owner:** audit remediation v2
- **Affects specs:** cli

## Why

Audit item C9. `doctrina change abandon <id>` deleted a change folder
immediately: no prompt, no `--force` requirement, no preview of what was
about to go. The ledger entry it writes is good practice and is not a
substitute for being asked.

Related, and the same shape: `init` checked `process.stdin.isTTY` before
the ADAPTER prompt but not before the project-description prompt, which
ran unconditionally and silently accepted the empty string EOF returns. A
non-interactive caller that forgot `--non-interactive` got a project with
a blank description and no warning.

## What

- `lib/prompt.js`: `isInteractive()`, and `confirm()` takes an explicit
  `whenNonInteractive` — destructive callers pass `false`, because silence
  is not consent.
- `change abandon` previews the files, states the deletion is permanent,
  and asks. Off a terminal it refuses with exit 2 and names `--force`.
- `init` refuses a blank description instead of scaffolding one; the
  adapter wizard now uses the shared `isInteractive()` helper.
- Tests: both refusals, plus the definition-of-done invariant that no
  mutating command destroys authored content — with `intent add` as the
  documented exception, held to append-only.

## Scope boundaries

- `change abandon` stays single-id: abandonment is destructive and
  deserves one deliberate call, so it is not folded into the batch driver.
- Other destructive-ish paths (`--force` on adapter remove, archive) were
  already explicit opt-ins and are unchanged.

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
