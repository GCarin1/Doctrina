# Change 0008-per-command-flags — Flag specs live with their command; a static test proves none is undeclared

- **Status:** applied
- **Applied:** 2026-08-06
- **Date:** 2026-08-06
- **Owner:** audit remediation v2
- **Affects specs:** cli

## Why

Audit item C3. `src/index.js` passed one global `boolean:` array to
`parseArgs` for every command, and six flags read via `flagBool` were
missing from it: `chore`, `no-spec`, `design`, `from-diff`, `quiet`,
`run` — plus `debug`, read in the entrypoint's own catch block.

When a flag is not declared boolean and the next token does not start
with `-`, `parseArgs` consumes that token as the flag's value. The
positional is eaten AND `flagBool` then receives a non-`"true"` string and
returns false, so the flag is silently ignored on top of the argument
loss. `doctrina change new --chore ajuste-ci "Ajustar CI"` answered
"requires a title" for a title that was right there in quotes.

The structural fault: flag declarations lived in the entrypoint, not with
the command, so every new command had to remember to edit a file it had
no other reason to touch.

## What

- Every `src/commands/*.js` exports `flags = { boolean, string }`.
- `src/index.js` parses twice: a bootstrap pass with the global flags to
  resolve `positional[0]`, then a full parse with that command's spec
  merged over the globals.
- `lib/flag-catalog.js` (landed with D1) is the shared catalog; the docs
  gate and this test consume the same declarations.
- `test/flag-catalog.test.js` — the real deliverable: every command
  declares a spec; every flag READ is declared; every flag documented in
  a command's Options block is declared; globals are not redeclared; and
  the audit's exact reproduction passes in both flag positions.
- Docs EN+PT: the Global flags section states that position does not
  matter and how it is enforced.

## Scope boundaries

- Flag NAMES are unchanged; nothing is renamed or removed.
- The help-drift check reads the Options block only. Prose elsewhere
  legitimately names other commands' flags, and wrapped prose can start a
  line with one — anchoring on indentation alone reported drift that was
  not there, twice, while writing this.

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
