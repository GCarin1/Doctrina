# Doctrina — Product

## Vision

A spec-driven development framework whose primary unit of value is a small,
dense, portable artifact stack that any AI coding agent can consume on day one
without proprietary lock-in.

## Problem

Teams adopting AI coding agents in 2026 hit four recurring failure modes:

1. **Context drift.** Specs go out of sync with code; the agent reads stale truth.
2. **Decision amnesia.** Architectural decisions are lost in chat history.
3. **Multi-agent chaos.** Parallel agents take conflicting implicit decisions.
4. **Documentation theater.** Frameworks add ceremony that nobody maintains
   after the first sprint.

The existing market (Spec Kit, OpenSpec, Kiro, BMAD, SpecWeave) partially
addresses each, but the entire field has converged on two truths that
Doctrina takes as non-negotiable:

- Files in git are the most durable substrate for agent context.
- AGENTS.md is the de facto portable standard.

A third truth shapes how Doctrina is built but is less widely known:
context engineering, not agent count, predicts performance. On the
BrowseComp evaluation, Anthropic measured that **token usage alone
explains 80% of the variance in task performance**, with tool-call
count and model choice carrying the remaining variance (source:
[How we built our multi-agent research system](https://www.anthropic.com/engineering/built-multi-agent-research-system),
Anthropic engineering blog, June 2025).
The implication is direct: investing in dense, well-scoped context
artifacts (specs, ADRs, AGENTS.md) returns more than investing in
agent topology (more roles, more parallelism). Doctrina's design
follows the data.

## Target users

| Segment | Why Doctrina fits |
|---------|-------------------|
| Solo developers using Claude Code, Codex CLI, or Cursor | Low-ceremony defaults, AGENTS.md works out of the box |
| Small teams adopting SDD | Versioned artifacts review well in PRs |
| Brownfield projects | Specs as current-truth (OpenSpec model), not waterfall artifacts |

Doctrina is **not** for: throwaway prototypes, one-line fixes, or teams that
already have a working SDD process they like.

## Scope (v0–v3)

In scope:

- AGENTS.md-first authoring conventions.
- `.doctrina/` layout with specs, changes, decisions, templates, index.
- Node.js CLI for scaffolding, validating, and archiving.
- Adapters for 12 AGENTS.md-aware agents: seven install thin pointer
  files (Claude Code, Cursor, GitHub Copilot, Gemini CLI, Aider,
  Windsurf, Continue); five read `AGENTS.md` natively and need no
  file (OpenAI Codex CLI, Amp, Devin, Factory, Jules).
- Bilingual documentation (EN primary, PT translated).

Out of scope (deferred or rejected):

- `memory/` folder (deferred — see ADR 0003).
- Multi-agent parallel writers (rejected — see ADR 0004).
- Database, vector store, or RAG infrastructure (v0/v1 hard rule).
- Hosted SaaS, web UI, or analytics backend.

## Non-goals

- Doctrina is not an agent runtime. It is a context substrate. The agents
  themselves (Claude Code, Codex CLI, Cursor) are not bundled or replaced.
- Doctrina is not a project management tool. It does not track velocity,
  burndown, or assignees.
- Doctrina does not generate code. Agents do, against Doctrina artifacts.

## Success criteria

A Doctrina adoption is successful when, after one quarter:

- Rework rate (DORA 5th metric) is lower than the pre-adoption baseline.
- PR review time has not grown by more than 50% (Faros 2025 paradox limit).
- No artifact category is consistently unread by humans or agents.
- The team can answer "why was X decided?" by pointing to a single ADR.
