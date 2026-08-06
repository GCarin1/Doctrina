# Change 0012-exit-codes — Exit codes are a documented contract, not three meanings for 1

- **Status:** applied
- **Applied:** 2026-08-06
- **Date:** 2026-08-06
- **Owner:** audit remediation v2
- **Affects specs:** cli

## Why

Audit item C7 — the smallest change in Part A and the one an autonomous
loop depends on most. Swept across every command, exit code 1 carried
three unrelated meanings: a gate failed, the project is not configured,
the machine cannot run this. They demand three different responses —
iterate, set up, stop — and a machine reading 1 for all three either
spins on an unfixable failure or abandons a fixable one.

## What

- `lib/exit-codes.js`: the five-class enum with a meaning and an agent
  action per class, `PreconditionError` / `EnvironmentError` carrying a
  remedy command, and the shared `notADoctrinaProject()` constructor.
- The entrypoint maps a typed error to its class and prints the remedy;
  an untyped throw stays GATE.
- 29 command modules now raise the typed precondition; `verify` without a
  config and `intake` with none return 3; `validate` outside a project
  returns 3 instead of a wall of gate errors.
- `--help` prints the contract, generated from the enum.
- Docs: new `exit-codes.md` (EN+PT, linked from both sidebars) and the
  reference tables rewritten with the classes and the agent action.

## Scope boundaries

- Class 4 (ENVIRONMENT) is defined and reachable but has few call sites
  yet; C8 is where the git-dependent commands are audited into it.
- `--json` on every command is M7. The two together form the machine
  contract; this change is the status half.
- Codes 0 and 2 keep their previous meanings, so most consumers see no
  change; 1 narrows to mean only "the work is not ready".

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
