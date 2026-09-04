# Change 0031-a-wiring-row-may-declare-the-source-variable — Two defects in what 0.15.0 shipped

- **Status:** applied
- **Applied:** 2026-09-04
- **Date:** 2026-09-04
- **Owner:** Gcarini
- **Affects specs:** gates

## Why

Dogfooding 0.15.0 on this repository (change 0030) surfaced two defects in
the runtime surface it had just shipped.

**RT02 offers a remedy the artifact cannot express.** This repository's
release workflow exports `NODE_AUTH_TOKEN` from `secrets.NPM_TOKEN` — a
deliberate rename, because the name is npm's, not ours. `contract check`
correctly reports the risk (rename the GitHub secret and the expression
resolves to the empty string, so `npm publish` fails on a blank
credential with nothing pointing at the cause) and then advises: "record
the intentional rename in the Wiring row". There is no way to do that.
`Origin` is compared exactly against `vars`/`secrets`, so writing
`secrets:NPM_TOKEN` makes the row fall out of the check entirely, taking
RT01 with it. The result is a permanent, unsuppressible warning — which
trains readers to ignore warnings, the opposite of the point.

**An `expect` guard kills streaming.** A check that declares an
expectation runs with its output captured and echoed only when it
finishes. On this repository's suite that is roughly forty seconds of
blank terminal; on a suite of minutes it is worse. Nothing about reading
a check's output requires withholding it until the end.

## What

- **A wiring row may declare its source name.** `Origin` accepts
  `<origin>[:<source>]` — `secrets:NPM_TOKEN` means "this variable is
  exported from the secret named NPM_TOKEN". When the workflow matches
  that declaration, RT02 stays silent; when it does not, it warns as
  before. RT01's remedy quotes the declared source, so the line it tells
  you to paste is the correct one. A bare origin behaves exactly as it
  does today.
- **`expect` checks stream and capture at the same time.** The execution
  path for a check with an expectation becomes an async spawn that tees
  child output to the terminal as it arrives while accumulating it for
  the match. Checks without an expectation are untouched.

## Scope boundaries

- No new check, no new code. RT02 gains a way to be answered; it does not
  change what it looks for.
- The tee applies only to checks declaring `expect`. Every other check
  keeps the `stdio: "inherit"` path it has today.
- Declaring a source name suppresses only the NAME-mismatch warning. An
  ORIGIN mismatch (declared `vars`, workflow reads `secrets`) stays an
  error: that one is never intentional.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] This repository's own contract declares `secrets:NPM_TOKEN` and `contract check` is clean.
- [x] A long-running `expect` check is observed streaming, not buffering.

## Open questions

None.
