# Change 0030-declare-the-release-wiring-and-the-always-loaded — declare the release wiring and the always-loaded context ceilings in a system contract, and make the local test gate fail-closed on a run of zero tests

- **Status:** applied
- **Applied:** 2026-09-04
- **Date:** 2026-09-04
- **Owner:**
- **Affects specs:** (none — chore)

## Why

declare the release wiring and the always-loaded context ceilings in a system contract, and make the local test gate fail-closed on a run of zero tests

## What

Dogfooding the runtime surface 0.15.0 shipped: the framework declared a
feature about "silence is not proof" while its own `doctor` reported
`no contracts — nothing declares a runtime surface`, and its own test
gate would have passed a run of zero tests.

- **`.doctrina/contracts/system.md`** (new) — declares the release
  wiring and the two always-loaded ceilings. Ports and Selectors are
  deleted rather than filled: a CLI listens on nothing and this project
  dispatches on no test selector, and invented rows would be worse than
  absent ones.
- **Wiring: `NODE_AUTH_TOKEN` <- `secrets.NPM_TOKEN`** — a deliberate
  rename (the name is npm's), which `contract check` reports as RT02.
  The warning is kept because the risk is real: renaming the GitHub
  secret resolves the expression to the empty string and `npm publish`
  fails on a blank credential with nothing pointing at the cause.
- **Budgets** — `agents-md-lines` (output, 150) and `context-pack`
  (input, 15000). The first encodes a discipline applied twice while
  cutting 0.15.0: when the generated block did not fit, the content was
  cut rather than the cap raised.
- **`.doctrina/verify.json`** — the `test` check gains an `expect`
  guard. `node --test` prints `pass 0` and exits 0 when it matches no
  test files (verified empirically), so the gate could have passed a
  suite that ran nothing.

No spec deltas: every requirement involved was already written. This is
configuration and declaration catching up to it.

## Scope boundaries

<!-- Anything adjacent that this change deliberately does NOT touch. -->

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
