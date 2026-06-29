# Adapters

Doctrina is AGENTS.md-native. Adapters are thin pointer files that
let agents which expect a different filename (Claude Code, Cursor)
find the canonical `AGENTS.md` automatically. Adapters never duplicate
the content of `AGENTS.md`; they reference it.

## Why thin adapters

ADR 0001 makes AGENTS.md the single source of truth. Per-agent files
exist only because agents that preload a specific path
(`CLAUDE.md`, `.cursor/rules/*.mdc`). The adapter is the smallest
possible bridge between that preload and `AGENTS.md`.

Three properties every adapter file in this project has:

- Under 30 lines (`doctrina validate` enforces this).
- One job: route the agent to `AGENTS.md`.
- No rules of its own. If a rule belongs anywhere, it belongs in
  `AGENTS.md` and is read once.

## Claude Code

`doctrina init --agent claude` writes `CLAUDE.md` at the project root:

```
# CLAUDE.md — <project>

This project uses the open AGENTS.md standard as the single source of
truth for agent-readable rules. The canonical file is at the
repository root; this CLAUDE.md is a thin pointer so Claude Code's
auto-loading picks it up.

@AGENTS.md

The Doctrina framework artifacts (specs, decisions, changes) live
under .doctrina/. Read order is documented in AGENTS.md.
```

The `@AGENTS.md` line uses Claude Code's `@file` import directive.
Claude Code reads `CLAUDE.md` automatically when it starts in a
project and follows the import. From Claude's perspective, the
canonical context is `AGENTS.md`.

### Native slash commands

The `claude` adapter also installs `.claude/commands/doctrina-*.md`,
surfacing the core workflow as native Claude Code slash commands so the
agent does not have to know to shell out to the CLI:

| Command | Runs |
|---------|------|
| `/doctrina-work <prompt>` | `doctrina work` + drives the change through the gates |
| `/doctrina-next` | `doctrina next` / `doctrina status` and acts on the top item |
| `/doctrina-context [cap]` | `doctrina context --concat` (the read pack) |
| `/doctrina-status` | `doctrina status` health dashboard |
| `/doctrina-why <cap>` | `doctrina why` provenance chain |

Each is a thin prompt that calls the CLI and relays its output — the CLI
stays the single source of truth.

## OpenAI Codex CLI

`doctrina init --agent codex` installs **nothing**. The OpenAI Codex
CLI is one of the reference implementations of the AGENTS.md spec
and reads `AGENTS.md` natively. An adapter file would only add
drift surface.

The `adapters/codex/` directory exists in the templates inventory so
the structure is symmetric across supported agents, and so future
Codex-specific affordances (custom subagent definitions, for example)
have an obvious home.

## Cursor

`doctrina init --agent cursor` writes
`.cursor/rules/00-doctrina.mdc`:

```
---
description: Doctrina canonical rules — always read AGENTS.md first
alwaysApply: true
---

# Doctrina pointer rule

This project uses the open AGENTS.md standard as the single source of
truth for agent-readable rules. Before answering or editing, read the
canonical file at ../../AGENTS.md.

The Doctrina framework artifacts (specs, decisions, changes) live
under .doctrina/. Read order is documented in AGENTS.md.

Do not duplicate rules here. If a rule belongs in AGENTS.md, put it
there and re-read this project.
```

The `alwaysApply: true` frontmatter means Cursor includes this rule on
every request, so the pointer always fires. The rule is 16 lines —
well under the 200-word Cursor token-tax guidance.

Cursor exposes four rule modes — Always Apply, Auto-Attached
(globs), Agent-Requested (description), and Manual (`@name`).
Doctrina ships only the Always Apply pattern in its adapter
because the pointer must fire on every request to be useful. The
other three modes are excellent scoping primitives for
project-specific rules layered on top of the Doctrina pointer;
see [context-engineering.md](context-engineering.md) for how they
map to Doctrina's own scoping model.

### Native slash commands

Like the `claude` adapter, the `cursor` adapter also installs
`.cursor/commands/doctrina-*.md` — the same core-loop commands
(`/doctrina-work`, `/doctrina-next`, `/doctrina-context`,
`/doctrina-status`, `/doctrina-why`), each a thin prompt that invokes
the CLI so the workflow is discoverable inside Cursor without the
agent having to know to shell out.

## Nested AGENTS.md (one root, multiple subsystems)

AGENTS.md tools honour a hierarchy: when an agent edits a file, the
**nearest** `AGENTS.md` (the one closest to that file in the
directory tree) takes precedence over any AGENTS.md further up. For
reference, OpenAI's main repository carries 88 nested `AGENTS.md`
files. The pattern scales.

Doctrina supports this directly. The root `AGENTS.md` carries the
global rules; a subsystem can drop its own `AGENTS.md` with
path-scoped overrides. Use cases:

- A subsystem that uses a different language than the rest of the
  repo and needs different test/lint commands.
- A legacy area that should be touched with extra caution ("do not
  refactor without an ADR").
- A high-blast-radius area (auth, billing, migrations) that needs
  tighter "done" criteria than the rest.

Keep each nested file under the same 150-line soft cap; the
hierarchy is for scoping, not for total content. The CLI does not
yet generate nested files for you (`doctrina init` writes the root
only); create them by hand and validate normally.

## Additional adapters (v0.1)

Five more agents ship adapters in v0.1, all following the same
thin-pointer pattern:

| Agent | File installed | Detection |
|-------|----------------|-----------|
| `copilot` | `.github/copilot-instructions.md` | GitHub Copilot's repository-level custom instructions |
| `gemini` | `GEMINI.md` at project root | Gemini CLI native |
| `aider` | `CONVENTIONS.md` at project root | Aider reads CONVENTIONS.md as cached read-only context |
| `windsurf` | `.windsurfrules` at project root | Windsurf rules file convention |
| `continue` | `.continue/rules/00-doctrina.md` | Continue.dev rules directory |

Each is under 30 lines and only routes the agent at `AGENTS.md`.
`doctrina init --agent <name>` accepts any of the twelve agent
slugs (`claude`, `codex`, `cursor`, `copilot`, `gemini`, `aider`,
`windsurf`, `continue`, `amp`, `devin`, `factory`, `jules`) or
`all` to install every adapter. The last four, like `codex`, are
AGENTS.md-native and install no file (see the next section).

For local LLMs (LLaMA, Mistral, Qwen, DeepSeek) and
non-Anthropic cloud endpoints, see
[local-llms.md](local-llms.md) for setup recipes that wire the
chosen runtime through Doctrina to your preferred model.

## AGENTS.md-native runtimes (no adapter file)

Four additional agents read `AGENTS.md` natively per the Linux
Foundation announcement of December 2025. `doctrina init --agent
<name>` for any of these installs no file (same posture as
`codex`); the directory under `templates/adapters/` exists so
the inventory stays symmetric and future per-agent affordances
have an obvious home.

| Agent slug | Tool |
|------------|------|
| `codex` | OpenAI Codex CLI |
| `amp` | Sourcegraph Amp |
| `devin` | Cognition Devin |
| `factory` | Factory AI |
| `jules` | Google Jules |

For these five, AGENTS.md alone is sufficient. The Doctrina
adapter directory only exists to mark the support contract
explicitly.

## Installing more than one

```
doctrina init --agent all
```

Installs every adapter in one pass. There is no conflict: each agent
reads its own file and they all end up pointing at the same
`AGENTS.md`.

## Adding a new agent

When a new coding agent becomes relevant (Copilot custom instructions,
Gemini CLI, Windsurf, etc.), the addition is:

1. Add a directory `.doctrina/templates/adapters/<agent>/` containing
   the smallest possible pointer file for that agent. Keep it under
   30 lines and use only canonical tokens (`{{AGENTS_MD_PATH}}` is
   usually all you need).
2. Add `<agent>` to the `SUPPORTED_AGENTS` array in
   `packages/doctrina-cli/src/commands/init.js`.
3. Add a row to the supported-adapters table in the `templates` spec
   and to this doc.
4. Open the change with `doctrina change new` and follow the normal
   workflow.

No core code changes are required because the adapter machinery
walks the directory generically.
