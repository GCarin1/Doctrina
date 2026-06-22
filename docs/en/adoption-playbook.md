# Adoption playbook — Doctrina in an existing multi-agent project

A concrete, command-driven walkthrough for the most common real-world
case: an **in-progress codebase** with little or no specs, no shared
`AGENTS.md`, and no captured app context — worked on by **several agents
at once** (e.g. Cursor + Copilot + Claude).

This is the step-by-step companion to two concept docs:
[Brownfield adoption](brownfield.md) (the *principles* — spec
just-in-time, retroactive ADRs) and the [Multi-agent model](multi-agent.md)
(*why* one `AGENTS.md` is the contract). Read those for the why; use this
for the how.

> **The golden rule: do not big-bang.** Doctrina is additive and
> incremental. You do not stop development to "write all the specs." You
> drop the scaffolding in once, then backfill one capability at a time, as
> you touch it. A day-one spec sprint produces unread specs by week eight
> (see [Brownfield adoption](brownfield.md)).

## Phase 0 — Install, non-destructively

```bash
doctrina init --from .        # fold an existing AGENTS.md / README into product.md, scaffold .doctrina/
doctrina init --agent all     # or pick: --agent cursor / copilot / claude
```

`init` only adds files (`AGENTS.md` + `.doctrina/`); it never touches your
code. `--agent` installs **thin adapters** — `.cursor/rules/00-doctrina.mdc`,
`.github/copilot-instructions.md`, `CLAUDE.md` — each **≤ 30 lines and each a
pointer to one `AGENTS.md`**. `doctrina validate` enforces that 30-line cap,
so the three tools *cannot* drift apart: there is one source of truth.

Record the adoption itself as a chore (a change that touches no spec):

```bash
doctrina change new 0001-adopt "adopt Doctrina scaffolding" --chore
```

## Phase 1 — Capture intent (product.md), not specs yet

```bash
doctrina intake --text "<the app's vision / a paste of the PRD>"
```

This stores the intent verbatim and prints the bootstrap playbook. Let your
**longest-context agent (e.g. Claude Code)** run it: fill `product.md` —
vision, in/out scope, **success criteria `[SC1]`…**, delivery order.
Everything downstream anchors here (`doctrina trace` checks that each
capability traces back to a success criterion).

## Phase 2 — Backfill specs from the code (the key move)

Do **not** document the whole app. Use `doctrina metrics` (local git churn)
to find the most-edited, most-bug-prone capabilities and start there.

For **work-in-progress you have not committed**, it is one command:

```bash
doctrina work --from-diff
```

It reads the working-tree changes, ranks the capability by the **files you
touched** (not just prompt words), records the changed files under the
proposal's `## Why`, and prints a *code-first backfill* playbook: write the
spec that **describes what the code already does**, with each acceptance
criterion `[unverified]` until a test proves it.

For **already-committed code**: `doctrina spec new <cap>`, then have the
agent read the code and write the spec of its *current* behaviour. Keep the
two axes honest — `Implementation: partial`, criteria `[unverified]`. Then
`doctrina coverage` becomes your **debt worklist** (don't run `--strict`
yet; you will fail on purpose, and that is the honest state).

## Phase 3 — Capture app context as skills

This fixes the "no captured context" gap — the procedural knowledge every
agent keeps getting wrong:

```bash
doctrina skill new running-locally      # how to build / run
doctrina skill new domain-glossary      # the domain terms
doctrina skill new deploy-runbook       # deploy steps, gotchas
```

Skills load **on demand** (keeping `AGENTS.md` lean) and are indexed and
shared by all three agents. See [Skills](skills.md).

## Phase 4 — Turn on the ratchet

```bash
doctrina hooks install     # pre-commit runs validate (now also catches index drift)
doctrina verify --init     # declare your typecheck / test / build commands
doctrina verify --clean    # static lint for clean-checkout footguns (unbuilt dist, ungenerated Prisma client)
```

Run `verify --clean` *before* you onboard more agents or teammates — it
catches the "works on my machine, breaks on a fresh clone" class of bugs
up front. From here, new work goes through `doctrina work` (spec-first) or
`doctrina work --chore` (infra/docs/build), and the backfill continues
opportunistically — every time you touch an un-spec'd capability, document
it.

## Working with Cursor + Copilot + Claude together

- **One source, three mouths.** `AGENTS.md` is the contract; the three
  adapters are tiny pointers to it. Keep `AGENTS.md` under its caps (warn at
  150 lines, error at 200) and push detail into **specs and skills**, which
  agents pull on demand with `doctrina context <cap>` and `doctrina search`.
- **Different context budgets, same artifacts.** Copilot (small, inline) and
  Cursor (rules + retrieval) benefit most from short specs/skills; **Claude
  Code** can run the CLI directly (`intake`, `work --from-diff`, `context`,
  `validate`). Suggested roles: **Claude** for the intake→product
  distillation and spec backfill (long-context synthesis); **Cursor /
  Copilot** for in-editor implementation *against the specs that now exist*.
  The specs and skills are precisely what make smaller-context completions
  stay consistent with the project.
- **Anti-drift between agents.** Because the index is now a single truth
  (`validate` errors on metadata drift), three agents editing in parallel
  cannot silently desync `index.json` without the pre-commit hook catching
  it.

## Honest cautions

1. **Incremental, not a museum.** Spec a capability only when you are about
   to work on it. A parked spec becomes a lie.
2. **Keep the two axes honest.** Backfilling everything as `[verified]` is
   the anti-pattern — let `coverage` / `trace` show the debt.
3. **Right-size your specs (review item 3.7).** Doctrina's own `cli` spec is
   oversized (> 400 lines) — a live example of over-spec'ing. Keep yours
   small and split by capability.
4. **Retroactive ADRs are discoveries, not authorship.** When you find a
   past decision in the code, write the ADR dated today with a "discovered,
   not authored on this date" note (see [Brownfield adoption](brownfield.md)).

## Start today (minimal sequence)

```bash
doctrina init --from . --agent all          # scaffold + align the three agents
doctrina intake --text "<vision/PRD>"       # Claude fills product.md
doctrina work --from-diff                   # on a hot capability (or: spec new <cap> + backfill)
doctrina skill new running-locally          # capture the context agents keep missing
doctrina hooks install                      # ratchet on
```

## Related material

- [Brownfield adoption](brownfield.md) — the principles (spec
  just-in-time, retroactive ADRs) this playbook applies.
- [Multi-agent model](multi-agent.md) — why one `AGENTS.md` is the contract.
- [Agent adapters](adapters.md) — the per-tool pointer files.
- [Skills](skills.md) — capturing app context as on-demand procedural memory.
- [Workflow](workflow.md) — the change cycle the backfill plugs into.
- [Gating](gating.md) — when the full pipeline pays for itself.
