# Upgrading Doctrina

Updating the CLI does not update the project you scaffolded with it.
They are separate things, and the gap between them is where most
"why is my AGENTS.md missing the new commands?" reports come from.

```bash
npm update -g doctrina-cli   # the tool
doctrina upgrade --write     # the project
```

`doctrina upgrade` previews by default. `--write` applies.

## What `upgrade` actually does

Three steps, each delegating to a command that already exists, so
there is one definition of each:

1. **Scaffold shape** (`templates update`) — adds recommended
   sections that are missing, and regenerates the two CLI-owned
   blocks in `AGENTS.md`: the command surface and the agent-facing
   changelog. **Additive only.** It never rewrites a line you wrote.
2. **Index and framework stamp** (`index rebuild`) — regenerates
   `.doctrina/index.json` from the tree and records which CLI version
   last managed it.
3. **Structural check** (`validate --fix`) — reports what an additive
   upgrade cannot fix by itself, and repairs the mechanical part.

## Does one `upgrade --write` cover every agent I installed?

**Yes, for the pointer files** — and that is all there is to cover.
Every adapter (`CLAUDE.md`, `.cursor/rules/`, `GEMINI.md`, …) is a
thin pointer at the one `AGENTS.md`. Regenerating the hub is what
updates them all, because none of them carries a second copy of
anything. That is the whole reason the pointer design exists.

Two things `upgrade` deliberately does **not** do:

- **Install adapters you do not have.** Adding an agent is a separate
  decision, not a side effect of upgrading (ADR 0016). Use
  `doctrina adapter add <name>`.
- **Touch your authored content.** `AGENTS.md` prose, `product.md`,
  specs and ADRs are yours.

Check what is installed:

```bash
doctrina adapter list
```

## Verifying an upgrade landed

<!-- illustrative -->
```
doctrina upgrade --write
✓ project upgraded to 0.14.0
```

Then confirm the hub really carries the current surface:

```bash
doctrina validate           # 0 errors
doctrina context --concat   # what an agent will actually read
```

If `validate` reports drift in the `doctrina:surface` block, the
regeneration did not run — check that `AGENTS.md` still contains
both marker comments. The blocks are CLI-owned; edits inside them
are overwritten by design (ADR 0015).

## On-disk format changes

Every format change ships with its migration inside `upgrade`, and
with a test that reads a tree written before the change. Optional
fields are the normal case: absent means the previous default, so a
project that never opts in keeps behaving as it did.

`0.14.0` added one: an optional `config` block in `index.json`.

```json
{ "config": { "context_budget": 15000 } }
```

Absent means the 15,000-token default. See
[Context engineering](context-engineering.md#the-context-budget).

## After upgrading to 0.14.0

Two commands are worth running once, because they act on artifacts
that already exist rather than on new ones:

```bash
doctrina decision scope     # propose a scope for each unscoped ADR
doctrina context cli        # confirm the pack fits its budget
```

ADRs are immutable and never retire, so without a scope every
accepted decision loads into every context pack forever. `decision
scope` proposes one per ADR from the archived change that cites it;
`--write` applies them. Review before writing: a scope that is too
narrow hides a decision from the pack that needed it.

## If something looks wrong

```bash
doctrina doctor
```

It aggregates every gate and prints the remedy for each finding,
rather than making you guess which gate to ask.

## Related material

- [CLI reference](cli-reference.md) — `upgrade`, `adapter`,
  `templates`, `doctor`.
- [Adapters](adapters.md) — how the pointer files work.
- [Templates](templates.md) — the project-over-bundled resolution
  chain, and how to override one file.
- [Exit codes](exit-codes.md) — what a non-zero upgrade means.
