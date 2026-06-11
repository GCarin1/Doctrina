# Skills

A **skill** is on-demand procedural memory: a short, specialised
"how to do X well" file that an agent loads only when a specific
task matches. Skills complement `AGENTS.md` (always-loaded
procedural memory) without replacing it.

## The two-axis model

The CoALA memory taxonomy splits durable knowledge along two
axes. Doctrina maps to it like this:

| Type | Loaded | Doctrina artifact |
|------|--------|-------------------|
| Procedural · always | every turn | `AGENTS.md` + adapter pointer files |
| Procedural · on-demand | only when relevant | **skills** (this doc) |
| Semantic · current truth | spec read order | `.doctrina/specs/<cap>/spec.md` |
| Semantic · decision | when relevant | `.doctrina/decisions/NNNN-*.md` (ADRs) |
| Episodic | rarely (debugging) | `.doctrina/changes/archive/` |

Skills fill the "specialised procedure, not on every turn" cell.
Without them, you would either bloat AGENTS.md with niche
instructions (token tax every turn) or lose the knowledge
entirely (every agent re-invents it).

## What a skill looks like

```
.doctrina/skills/db-migration.md
```

```markdown
---
name: db-migration
description: How to add, modify, or roll back database migrations safely.
when: agent is asked to change the schema, add a migration, or roll one back.
---

# Skill — db-migration

## When to use this skill

The trigger sentence in `when:` plus this paragraph.

## Procedure

1. Run `make db-status` to see the current schema state.
2. ...

## Anti-patterns

- ...

## Related material

- [billing spec](../specs/billing/spec.md)
```

Three required frontmatter fields:

- `name` — must match the filename slug.
- `description` — one sentence agents read cheaply when deciding
  whether to load the full body.
- `when` — one sentence describing the trigger.

The body uses the same density rules as AGENTS.md: exact
commands, explicit guard-rails, verifiable checks.

## When to write a skill

Three triggers:

1. A procedure recurs across multiple changes (a migration
   pattern, a security review, a release flow) and currently
   lives in tribal memory.
2. AGENTS.md is creeping over the 150-line cap because of
   specialised content the agent does not always need.
3. A bug or incident exposed a missing-procedure root cause.

Two anti-triggers:

- The content belongs in a spec (it describes *what* the system
  does, not *how* to do a task with it).
- The content is project-wide and always-relevant (it belongs
  in AGENTS.md).

## How skills differ from the rejected `memory/`

ADR 0003 deferred a `memory/` folder because it would have been
auto-curated, dump-everything-prone, vague, and token-taxing.
Skills sidestep every dimension:

| Concern | memory/ failure | skill design |
|---------|-----------------|--------------|
| LLM auto-curation | Yes | No — human-authored only |
| Dump-everything growth | Yes | No — 200-line cap, validate enforces |
| Token tax on every turn | Yes | No — on-demand only |
| Vague semantic intent | Yes ("lessons") | No — explicit "how to do X" trigger |
| Documentation theater | Likely | Lower — each skill has a trigger sentence |

If `memory/` ever ships in a future version, skills remain
distinct: skills are procedural and pre-hoc; consolidated memory
would be post-hoc and reflective.

## Loading semantics by agent

Doctrina ships the structure; how an agent loads skills is up
to the runtime. Three honest patterns:

- **Claude Code**: native Skills feature. Point Claude Code at
  `.doctrina/skills/` (one-time config in Claude Code itself);
  the agent then discovers Doctrina skills through the native
  pathway.
- **Other agents with file context**: AGENTS.md mentions
  `.doctrina/skills/` in the read order. Agents that scan the
  workspace will see skill files and their frontmatter; full
  bodies load when the agent decides relevance, or when the
  user manually references a skill.
- **Local LLMs via Aider / Continue**: same as "other agents".
  The user references a specific skill in the chat (for example
  by typing `/add .doctrina/skills/db-migration.md` in Aider)
  when they want the procedure loaded.

The framework does not force a loading semantics on any agent;
it provides the directory layout and the validate enforcement.

## CLI

```sh
# Scaffold a new skill from the template, indexed automatically.
doctrina skill new db-migration

# Read-only: list skills with their descriptions.
doctrina skill list

# Mirror each skill's frontmatter description into index.json.
doctrina skill sync
```

`doctrina validate` walks `.doctrina/skills/` and warns on:

- Missing required frontmatter field (`name`, `description`, or
  `when`).
- Skill files over the 200-line cap (warning at 150).
- `name:` field that does not match the filename slug.
- Frontmatter description that differs from the one recorded in
  `index.json` (`doctrina skill sync` restores it).

All warnings, not errors — consistent with the rest of validate.

## Anti-patterns specific to skills

- **Skill that duplicates a spec**. Specs say WHAT, skills say
  HOW. If you are restating spec content, delete the skill.
- **Skill that should be in AGENTS.md**. If every task triggers
  it, it is not on-demand. Move to AGENTS.md.
- **Skill with vague `when:` clause** ("when the agent is
  coding"). The agent cannot match a trigger that broad. Be
  specific.
- **Skill written by an LLM without human review**. The ETH
  Zurich finding applies here too — uncurated context degrades
  outcomes.

## Related material

- [Workflow](workflow.md) — where skills fit in the cycle.
- [Context engineering](context-engineering.md) — why on-demand
  loading matters for token economy.
- [Multi-agent](multi-agent.md) — how skills relate to the
  phase-persona model.
- [Glossary](glossary.md) — the CoALA memory taxonomy entry.
