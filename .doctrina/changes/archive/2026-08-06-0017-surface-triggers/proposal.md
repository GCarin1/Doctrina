# Change 0017-surface-triggers — The command surface tells an agent when to reach for each command

- **Status:** applied
- **Applied:** 2026-08-06
- **Date:** 2026-08-06
- **Owner:** audit remediation v2
- **Affects specs:** templates

## Why

Audit item M2. The surface block was a name index: an agent reading
`doctrina trace --strict` learned the command exists and nothing about
what triggers it. Learning the surface meant running `--help` 35 times,
roughly the whole context budget spent on a lookup.

And reported from real use: when a new command shipped, the LLM driving
Doctrina had no idea the capability existed — it found out by running
`--help`, which it had no reason to run.

## What

- `COMMAND_META`: purpose + when + moment for all 35 commands; the block is
  generated from it, organised by moment, one line per command.
- A declared 40-line budget, enforced by `templates check`. Honouring it
  required compressing the "Maintain" moment to one line — the honest
  signal that the surface is at its limit (M8's input).
- An agent-facing changelog block: 3-6 lines of what alters agent
  behaviour, written by `init` and refreshed by `upgrade --write`.
- `SURFACE_GROUPS` deleted — `COMMAND_META.moment` is the one grouping.
- ADR 0020; catalog tests rewritten around the new structure.

**Two real bugs found while building this.**

1. A **destructive nesting bug**: `placeSurfaceBlock` scanned to the next
   `## ` heading, but a generated block's MARKER precedes its heading — so
   the surface block landed inside the changed block, and the next
   `upgrade` treated the outer span as stale and deleted everything
   between. The file halved. A marker now ends a section like a heading.
2. `init` did not write the changed block, so a fresh project was born
   needing a `templates update` — the C5 class again, caught by C5's own
   invariant test.

**A cost paid, not dodged.** The richer block pushed the scaffolded
AGENTS.md to 157 lines, over its own 150-line cap. Rather than exempt the
block, static prose in the template was trimmed to 140 lines — the cap
protects the same attention budget the triggers spend.

## Scope boundaries

- `AGENT_CHANGELOG` is hand-maintained per release; the test asserting the
  running version has an entry is the guard.
- Extending the `add-cli-command` skill to require purpose/when is left to
  the skill file itself; the mechanical gate is in `templates check`.
- Cutting commands to reach a smaller budget is M8.

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
