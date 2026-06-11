# Multi-agent model

Doctrina is pitched as a framework for multi-agent AI development.
This doc explains what that phrase means in this project and what
it does not. The architectural rationale is in
[ADR 0004](../../.doctrina/decisions/0004-single-linear-orchestrator.md);
this is the operating guide.

## What multi-agent means in Doctrina

Doctrina is multi-agent in three concrete ways:

1. **Multiple tools share one canonical context.** A project's
   `AGENTS.md` is read natively by OpenAI Codex CLI, by Claude Code
   (via the `CLAUDE.md` `@`-import adapter), by Cursor (via the
   `.cursor/rules/00-doctrina.mdc` adapter), and by other
   AGENTS.md-aware tools. Whichever agent shows up reads the same
   rules.
2. **The same workflow phases can be driven by different agents in
   sequence.** You can use Claude for spec drafting, Codex CLI for
   implementation, and another tool for review. The phase boundary
   is the handoff point.
3. **A single orchestrator can fan out read-only subagents.** Within
   one phase, an orchestrator may delegate isolated, read-only tasks
   (codebase search, lint output parsing, security scanning,
   retrieval) to subagents that return summarised context.

Doctrina is **not** multi-agent in the following way: it does not
run multiple writing agents in parallel against the same artifact.
That choice is deliberate and the rest of this doc explains why and
what to do instead.

## The model that works

```
              human intent
                   |
                   v
            +---------------+
            |  orchestrator |   single, linear, holds the full trace
            +---------------+
                   |
   spec  ->  plan  ->  implement  ->  review  ->  curate
     |        |          |              |          |
     |        |          |              |          |
     |        |          v              v          |
     |        |     read-only      read-only       |
     |        |     subagents      subagents       |
     |        |    (search,         (lint,         |
     |        |     retrieval)      tests,         |
     |        |                     security)      |
     |        |                                    |
     +--------+--- ADR triggers --------+----------+
                   |
                   v
            human approval gates
```

Three properties:

- **One writer per artifact at a time.** Whoever is editing
  `proposal.md` is the only one editing it. Same for spec files,
  ADRs, and code.
- **Shared trace.** Every step sees the work of the previous step.
  No context silos by role.
- **Read fan-out is allowed.** Subagents that only read (search the
  codebase, parse a lint report, retrieve relevant prior changes,
  scan for secrets) can run in parallel and stream summaries back.

## Why not role-based parallel agents

The intuitive "build a team of AI specialists" pattern (Analyst, PM,
Architect, PO, Dev, QA, etc.) is the dominant alternative in 2025–
2026 SDD frameworks. It mirrors how human teams divide labour and
markets well. The empirical record is unfavourable for code work:

- Cognition's [*Don't Build Multi-Agents*](https://cognition.ai)
  argues that parallel subagents which do not share the full trace
  make conflicting implicit decisions. The merge of those decisions
  is incoherent code.
- Anthropic, which is broadly bullish on multi-agent, states
  explicitly that orchestrator-worker fan-out is "less effective for
  tightly interdependent tasks like coding" and costs about 15×
  more tokens than a single chat session (source:
  [How we built our multi-agent research system](https://www.anthropic.com/engineering/built-multi-agent-research-system),
  Anthropic engineering blog, June 2025). Code writing is the
  worst-case interdependence profile.
- Claude Code itself uses subagents only for read-only
  investigation; it never spawns parallel code writers.

Doctrina inherits these findings as design constraints. Role labels
("Architect", "Tester", "Reviewer") are allowed as **prompt
personas the single orchestrator adopts in sequence**, never as
parallel processes contending for the same files.

## Practical patterns

### Personas, not parallel processes

If you want an "Architect mode" for design and a "Tester mode" for
review, switch the orchestrator's persona between phases. The same
agent, the same context, different framing prompt. No coordination
problem because there is no concurrency.

The five canonical personas the orchestrator adopts in sequence:

| Phase | Persona | Job | Output | Human gate? |
|-------|---------|-----|--------|-------------|
| Intent | **Spec / PO** | Refine the request into EARS requirements; kill ambiguity. | New spec or change proposal with delta. | Spec approval. |
| Plan | **Plan / Architect** | Produce `design.md` and `tasks.md`; surface architectural decisions. | Plan files + ADR drafts if needed. | Decisions on irreversible choices. |
| Execute | **Implement / Dev** | Implement tasks against the approved spec. | Code commits. | None (or PR review). |
| Verify | **Review / Tester** | Run lint, tests, security scans, `doctrina validate`; check cross-artifact consistency. | Pass/fail report. | None — read-only, may run as a subagent. |
| Curate | **Curator** | Merge applied deltas, archive the change, update the index. | Updated specs + cleaner archive. | None for mechanical work; human for any memory promotion (when `memory/` exists). |

These are **prompt personas**, not separate agents. Switching
persona means switching the framing prompt that the same
orchestrator uses; the trace and the artifacts on disk are the
shared context across the switch.

### Read-only subagents

Safe to fan out:

- Codebase search ("find every call site of `processOrder`").
- Retrieval over prior changes or ADRs.
- Lint or test output parsing.
- Static security scanning (Semgrep, Bandit, etc.).
- Build log analysis.

Each subagent returns text. The orchestrator decides what to do
with the text. The subagents never write to repository artifacts.

### Human approval gates

Doctrina has two natural human-in-the-loop checkpoints:

- After spec drafting and before implementation: the human approves
  the spec or the change proposal. This is where ambiguity gets
  killed.
- Before an architectural decision lands: the human approves or
  edits the ADR before its status flips from `proposed` to
  `accepted`.

A human-in-the-loop gate is not a multi-agent feature; it is the
absence of one. The orchestrator pauses, the human reads, the
orchestrator resumes.

### Multiple humans on the same change

Two reviewers commenting on a PR is fine. Two humans editing the
same `proposal.md` at the same time is the same hazard as two
writing agents: implicit conflicting decisions. Treat it the same
way — serialise the edits, share the trace, or split into separate
changes.

### Multi-agent across phases

You can hand off between agents at phase boundaries. Example flow:

- Claude Code drafts the spec and the change proposal.
- A human approves.
- Codex CLI implements the change against the approved spec.
- A human approves.
- Claude Code drives the review (lint summary, test results, spec
  consistency check).
- The orchestrator (whichever tool) archives the change.

Each agent owns one phase. None overlaps with another. The artifacts
in `.doctrina/` are the shared trace.

## When the line gets blurry

| Situation | Verdict |
|-----------|---------|
| Two AI reviewers running concurrent read-only checks | Safe. Both are read-only; outputs are summaries. |
| Local lint + CI lint at the same time | Safe. Both are validators that produce reports, not artefacts in `.doctrina/`. |
| An agent and a human editing the same `proposal.md` | Hazard. Same artifact, two writers. Serialise. |
| Two changes in flight on disjoint capabilities | Safe. Different artifacts, no shared writer. |
| A subagent that "just patches a small file" | Hazard. The "small file" is a writer slot; the moment a subagent writes, the no-parallel-writers rule applies to it. |

## Related material

- [Workflow](workflow.md) — how the orchestrator moves through phases.
- [Antipatterns](antipatterns.md) — section 3 names the failure mode
  this doc helps you avoid.
- [Adapters](adapters.md) — how each supported agent finds
  `AGENTS.md`.
- ADR 0004 — the architectural decision behind the single linear
  orchestrator.
