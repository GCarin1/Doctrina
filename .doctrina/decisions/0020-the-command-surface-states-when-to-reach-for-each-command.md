# ADR 0020 — The command surface states when to reach for each command

- **Status:** accepted
- **Scope:** cli, templates
- **Date:** 2026-08-06
- **Deciders:** GCarini + agent session of 2026-08-06 (audit remediation v2)
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** `packages/doctrina-cli/src/lib/commands.js`, `packages/doctrina-cli/src/commands/templates.js`
- **Landed:** 2026-08-06 — covered by the catalog tests in `packages/doctrina-cli/test/commands.test.js`

## Context

The generated surface block (ADR 0015) solved discovery of WHICH commands
exist. It did not solve when to use them. An agent reading

    `doctrina trace --strict`

learns the command exists and nothing about what triggers it, what it
costs, or what it returns. Learning that means running `--help` on 35
commands — roughly the entire context budget, spent on a lookup.

Reported from real use: a new command shipped and the LLM driving Doctrina
had no idea the capability existed. It found out by running
`doctrina --help`, which it had no reason to run, because nothing told it
anything had changed.

Doctrina already solved both halves for SKILLS: `context` prints a
`description` and a `when:` trigger per skill, and instructs the agent to
load the body only when the trigger fires. Commands had no equivalent.

## Decision

1. Every command declares `purpose` (one line: what it does) and `when`
   (one line: the moment you reach for it) in `COMMAND_META`, plus the
   `moment` it belongs to. `templates check` fails when either is missing:
   a command that cannot state its trigger has not earned a place on the
   surface.
2. The surface block is generated from those fields, organised BY MOMENT,
   one line per command carrying purpose and trigger.
3. An **agent-facing changelog** — a marker-delimited `## What changed in
   <version>` block of three to six lines stating only what alters agent
   behaviour. Not `CHANGELOG.md`, which is 46 KB of human prose and far too
   large to carry into a context window. `init` writes it and
   `upgrade --write` refreshes it, so an agent reading AGENTS.md after an
   upgrade learns what is new without being told to look.
4. The block has a **declared line budget** (40), enforced by
   `templates check`. A surface that cannot describe itself in 40 lines is
   too large; the answer is to cut commands, never to raise the number.

## Alternatives considered

1. **Point the hub at `doctrina --help` for triggers.** Rejected: this is
   the failure the whole surface block exists to fix — agents do not run
   `--help` unprompted, which is exactly why 15 commands stayed invisible
   for 35 changes.
2. **Carry `CHANGELOG.md` into AGENTS.md.** Rejected on size: 46 KB of
   release prose written for humans, most of which changes nothing an
   agent does.
3. **Raise the line budget to fit every command with a trigger.**
   Rejected, and this is the load-bearing part: the budget is the forcing
   function. Honouring it required compressing the "Maintain" moment to one
   line, which is itself the honest signal that the surface is near its
   limit.

## Consequences

**Positive**

- An agent scanning the hub learns when to use a command, not only that it
  exists.
- After an upgrade the hub itself reports what changed for agents.
- The budget makes surface growth visible and costly, feeding the decision
  about which commands to cut.

**Negative**

- The block grew from 17 to 38 lines, which pushed the scaffolded
  AGENTS.md against its own 150-line cap. Static prose in the template was
  trimmed to pay for it rather than exempting the block — the cap protects
  the same attention budget the triggers spend.
- "Maintain" commands carry no per-command trigger in the block. They are
  reached for by a human after an upgrade, not by an agent mid-loop, which
  is the trade this budget forced.
- `AGENT_CHANGELOG` is hand-maintained per release. A release that forgets
  it ships a stale block; the test asserting the current version has an
  entry is the guard.

**Neutral**

- `SURFACE_GROUPS` is gone: `COMMAND_META.moment` is now the one grouping,
  so the two cannot disagree.
