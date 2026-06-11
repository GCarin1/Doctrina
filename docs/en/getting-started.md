# Getting started

This guide takes you from an empty repository to a working Doctrina
project in under five minutes.

## Prerequisites

- Node.js 20.12 or later (`node --version`).
- A git repository where you want to install Doctrina.

## Install

Doctrina is a Node.js CLI distributed on npm.

```
# install globally
npm install -g doctrina-cli

# or run on demand without installing
npx doctrina-cli init
```

The package name on npm is `doctrina-cli`; the executable it installs
is `doctrina`. Once installed globally you invoke every command as
`doctrina <subcommand>`.

The package has zero runtime dependencies, so installation is fast and
the supply-chain surface is empty.

## Initialise a project

From the root of your repository:

```
doctrina init --project-name "Acme" --agent claude
```

This creates:

- `AGENTS.md` at the project root — the portable, agent-readable
  operational source of truth.
- `.doctrina/product.md` — your project's vision, scope, and target
  users. Edit this immediately.
- `.doctrina/index.json` — metadata about every artifact.
- Empty `.doctrina/specs/`, `.doctrina/changes/`,
  `.doctrina/changes/archive/`, and `.doctrina/decisions/` directories.
- `CLAUDE.md` at the root because you passed `--agent claude`. Codex
  CLI reads `AGENTS.md` natively, so `--agent codex` installs nothing.
  `--agent cursor` writes `.cursor/rules/00-doctrina.mdc`. `--agent all`
  installs every adapter.

Validate the layout:

```
doctrina validate
```

You should see `ok all validation checks passed`.

## Your first capability spec

Doctrina treats capabilities as the unit of truth. Create one:

```
doctrina spec new billing
```

This scaffolds `.doctrina/specs/billing/spec.md` with EARS section
headings ready to fill in. Open it, write the requirements that
describe how billing works **today** (not what you wish it would
do — that goes in changes).

## Your first change

When you want to add, modify, or remove a capability, open a change:

```
doctrina change new 0001-add-stripe-webhook "Add Stripe webhook handler"
```

This creates `.doctrina/changes/0001-add-stripe-webhook/` with
`proposal.md`, `tasks.md`, and `design.md`. Fill them in. Then add the
spec delta:

```
mkdir -p .doctrina/changes/0001-add-stripe-webhook/specs/billing
# edit specs/billing/delta.md with Operation: MODIFIED and the delta body
```

Implement the work in code. When done, apply the change:

```
doctrina change apply 0001-add-stripe-webhook
```

Doctrina automates the common operations:

- **ADDED** deltas materialise a new spec file.
- **REMOVED** deltas delete the target spec.
- **MODIFIED** deltas print a manual-merge pointer; you merge by hand,
  which keeps the agent out of judgement calls about conflicting
  sections.

Finally, archive the change:

```
doctrina change archive 0001-add-stripe-webhook
```

The change folder moves to
`.doctrina/changes/archive/2026-06-03-0001-add-stripe-webhook/` and
disappears from the agent's default read path.

## Optional: scaffold a skill

When a specialised procedure recurs across changes (a migration
pattern, a security-review checklist, a release flow), capture
it as an on-demand skill:

```
doctrina skill new db-migration
```

This writes `.doctrina/skills/db-migration.md` with the
required `name`/`description`/`when` frontmatter. Agents read
the frontmatter cheaply and load the full body only when the
trigger fires. See [skills.md](skills.md) for the design
contrast with specs and the rejected `memory/` folder.

## Record an architectural decision

When you make a decision that future readers will care about:

```
doctrina decision new "Use Postgres as the primary store"
```

Edit the resulting ADR. Once approved, flip its `Status:` header from
`proposed` to `accepted`. From that moment on, the ADR is immutable.
To change a decision, supersede it:

```
doctrina decision supersede 0001 "Move to DynamoDB for global writes"
```

The new ADR is created with `Supersedes: 0001`. The old ADR's
`Status:` header is rewritten to `superseded by 0002`. The body of the
old ADR is untouched.

## Next steps

- Read [workflow.md](workflow.md) for the full lifecycle.
- Read [gating.md](gating.md) to learn when the pipeline is worth it.
- Read [antipatterns.md](antipatterns.md) before you hit them in the
  wild.
- Read [cli-reference.md](cli-reference.md) for every flag.
