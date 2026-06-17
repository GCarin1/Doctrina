# ADR 0004 — Adopt a single linear orchestrator instead of role-based parallel agents

- **Status:** accepted
- **Date:** 2026-06-03
- **Deciders:** project owner
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** `AGENTS.md` — single linear orchestrator rule; no parallel-write tooling ships

## Context

A popular pattern in 2025–2026 SDD frameworks (notably BMAD-METHOD) is to
define a cast of role-based agents (Analyst, PM, Architect, PO, Scrum
Master, Dev, QA, Orchestrator) and have them collaborate, often in
parallel, on a single feature. The intuitive appeal is high: it mirrors
how human teams divide labour.

The evidence on whether this pattern works for **code-writing tasks** is
unfavourable:

- Cognition's *Don't Build Multi-Agents* (Walden Yan, June 2025) argues
  that parallel subagents which do not share the full trace make
  conflicting implicit decisions, producing incoherent outputs.
- Anthropic's own multi-agent research, which is broadly bullish on the
  approach, explicitly states that multi-agent orchestration is "less
  effective for tightly interdependent tasks like coding" and costs ~15x
  more tokens than a single agent. Code writing is precisely the
  worst-case interdependence profile.
- Claude Code itself uses subagents only for **read-only investigation**,
  never for parallel writing.

Doctrina also chose AGENTS.md as its substrate (ADR 0001), which assumes
a single shared rule file rather than per-role context silos.

## Decision

Doctrina's reference orchestration is a **single linear orchestrator** that:

1. Coordinates the full workflow (specify → plan → implement → review →
   curate) sequentially.
2. Shares the complete trace with every step.
3. May invoke **subagents only for isolated read-only work** (codebase
   exploration, retrieval, lint output parsing, security scanning).
4. Never assigns two writing agents to the same artifact concurrently.

Role labels such as "Architect" or "Tester" are permitted as **prompt
personas** invoked sequentially by the single orchestrator, never as
parallel processes contending for the same files.

## Alternatives considered

1. **BMAD-style multi-agent crew (Analyst, PM, Architect, PO, SM, Dev, QA).**
   Rejected for code-writing. Doctrina may borrow BMAD's "story file" idea
   (self-contained context package per task) without adopting its agent
   topology.
2. **Anthropic-style orchestrator-worker fan-out for code generation.**
   Rejected. Anthropic itself documents this as poorly suited to code.
3. **Single agent, no orchestration, prompt-only.** Considered. Rejected
   because Doctrina exists precisely to add structured phases (spec, plan,
   change, ADR) that benefit from an explicit coordinator.

## Consequences

**Positive**

- Avoids the documented failure mode of conflicting implicit decisions.
- Lower token cost compared to multi-agent fan-out (~15x reduction per
  Anthropic's own figures).
- Compatible with Claude Code's subagent model and with single-agent
  Codex CLI / Cursor flows.

**Negative**

- Less marketable than "Doctrina ships a team of specialists." Marketing
  must lean on outcomes (reliability, cost) rather than agent count.
- Loses any genuine parallelism wins on truly independent subtasks.
  Doctrina mitigates this by allowing read-only subagent fan-out.

**Neutral**

- Doctrina remains agnostic to which underlying agent runs the
  orchestration (Claude Code, Codex CLI, Cursor, or a future agent). The
  orchestration discipline is enforced by file structure and conventions,
  not by a proprietary runtime.
