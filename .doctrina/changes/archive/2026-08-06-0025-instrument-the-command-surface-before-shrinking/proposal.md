# Change 0025-instrument-the-command-surface-before-shrinking — Instrument the command surface before shrinking it

- **Status:** applied
- **Applied:** 2026-08-06
- **Date:** 2026-08-06
- **Owner:** audit remediation v2
- **Affects specs:** cli cli

## Why

Instrument the command surface before shrinking it

## What

`lib/usage.js` plus `doctrina metrics --commands`. Four promises, each with
a test:

- **Off unless asked.** Nothing is recorded and no file appears until the
  operator sets `DOCTRINA_USAGE_LOG`. A tool that starts logging because it
  was updated has broken faith regardless of what it logs.
- **The operation only.** `change apply 0031-acme-codename` records
  `change apply`. The test asserts on the absence of the id, not on the
  presence of the operation.
- **Local, no network.** One append-only JSONL file at a path the operator
  names, gitignored.
- **Never fatal.** An unwritable target is swallowed. Losing a sample
  matters less than nothing; losing the command's real work to an
  instrumentation error would be absurd.

**A bug the first sample caught:** the recorder decided sub-operations by
SHAPE, so `context cli` was recorded as an operation and the real
`context` was reported as never invoked. Shape cannot separate `spec new`
from `context cli` — the catalog can, and now does. The wrong answer from
an instrument built to find unused commands.

## Scope boundaries

- **The cut is NOT in this change**, which is the half of M8 that stays
  open. Three real changes of data do not exist yet, and "never invoked
  this week" does not distinguish a command nobody wants from one used once
  a quarter (`init`, `intake`, `adapter add` are each used once per
  project by construction). The report says so on every run rather than
  presenting a count as a verdict.
- No aggregation, no upload, no identifiers. There is nothing here to send
  anywhere and no code that could.

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

Whether any operation is actually cut. That needs the data this change
makes it possible to collect.
