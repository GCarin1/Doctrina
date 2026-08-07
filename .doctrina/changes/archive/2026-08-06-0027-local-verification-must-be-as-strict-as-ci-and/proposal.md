# Change 0027-local-verification-must-be-as-strict-as-ci-and — Local verification must be as strict as CI, and the examples must trace to the intent that asked for them

- **Status:** applied
- **Applied:** 2026-08-06
- **Date:** 2026-08-06
- **Owner:**
- **Affects specs:** docs

## Why

CI failed on `main` at `doctrina trace --strict`, and no local gate had
said a word.

Two separate problems, one visible:

1. **SC5 was never realized.** "Example reference projects demonstrate a
   greenfield and brownfield adoption path" traces to no spec. Pre-existing
   — `docs` declared only SC3 before this release too — but D5 made `docs`
   the owner of `examples/`, so the gap is now clearly assignable.

2. **The local gate set is weaker than CI's, and nothing said so.** The
   repository's `action.yml` runs `coverage --strict` and `trace --strict`
   as hard gates. `.doctrina/verify.json` ran neither, and `close` treats
   trace as advisory on purpose ("provenance is a warning, not a hard
   gate"). So a change could close green, locally, and fail CI on a gate the
   author never ran. That is exactly the disagreement ADR 0017 removed for
   lifecycle transitions — never applied to the gate SETS themselves.

## What

- `docs` now realizes SC3 and SC5. Its requirements already cover
  `examples/`; the header just says so.
- `.doctrina/verify.json` gains `coverage --strict` and `trace --strict`,
  so this repository's declared verification matches what its own CI
  enforces. `close` runs `verify` as step 4, which means a dropped intent
  anchor now blocks a close here — without changing `close`'s policy for
  other projects, which declare their own strictness in their own
  `verify.json`.

The second half is the durable fix. The first would have recurred.

## Scope boundaries

- `close` still treats its own `trace` step as advisory. Whether provenance
  is a hard gate is a per-project decision, and `verify.json` is where a
  project states it — moving that policy into the command would take the
  choice away from every project to fix one.
- SC5 is marked realized, not proven. `coverage` measures whether criteria
  cite evidence; `trace` only asks whether an intent has an owner.

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

