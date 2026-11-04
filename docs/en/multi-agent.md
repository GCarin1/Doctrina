# Multi-agent model

Doctrina is pitched as a framework for multi-agent AI development.
This doc explains what that phrase means in this project and what
it does not. The architectural rationale is in
[ADR 0030](../../.doctrina/decisions/0030-um-planejador-orquestra-um-escritor-por-repositorio-executores-recebem-cartoes-autocontidos.md),
which supersedes ADR 0004; this is the operating guide.

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
3. **One planner delegates.** Within a change, the planner may fan out
   isolated, read-only tasks (codebase search, lint output parsing,
   security scanning, retrieval) to subagents that return summarised
   context, and may hand one task card at a time to an executor that
   writes it.

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
            |    planner    |   one per change, holds the full trace
            +---------------+
                   |
   spec  ->  plan  ->  implement  ->  review  ->  curate
     |        |          |              |          |
     |        |          v              v          |
     |        |      executor       read-only      |
     |        |    (one card at     subagents      |
     |        |     a time, one     (lint,         |
     |        |     writer per      tests,         |
     |        |     repository)     security)      |
     |        |          |                         |
     |        |      read-only                     |
     |        |      subagents                     |
     |        |     (search, retrieval)            |
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
personas the planner adopts in sequence**, or as subagents with a
bounded job — an executor on one task card, a read-only reviewer —
never as parallel processes contending for the same files.

## Planner and executors (ADR 0030)

ADR 0030 keeps everything above and allows two kinds of delegated
writing, because each keeps one writer per artifact:

- **An executor holding a task card.** The planner writes a change's
  tasks as self-contained cards — the task and its `Files:`,
  `Requirement:` and `Verify:` lines — and hands one at a time to an
  executor subagent with `doctrina change card <id>`. The card carries
  the change's Why and the spec cut to the task, so the executor does
  not need the planner's trace; a card that does is not finished. The
  executor edits, verifies, ticks and reports. It never opens, closes
  or archives — the planner reviews and closes. The executor may run on
  a smaller model: the planner is where judgement is spent.
- **Different repositories in parallel.** A delivery that crosses
  repositories opens one change in each (`doctrina delivery`).
  Repositories share no artifact, so one writer in each at the same
  time is still one writer per artifact. Two writers in ONE repository
  stay forbidden.

The [workspace guide](workspace.md) is the operating manual: the
generated `doctrina-executor`, `doctrina-reviewer`, `doctrina-qa` and
`doctrina-observer` subagents, and the guard on every MCP call.

## Practical patterns

### Personas, not parallel processes

If you want an "Architect mode" for design and a "Tester mode" for
review, switch the planner's persona between phases. The same
agent, the same context, different framing prompt. No coordination
problem because there is no concurrency.

The five canonical personas the planner adopts in sequence:

| Phase | Persona | Job | Output | Human gate? |
|-------|---------|-----|--------|-------------|
| Intent | **Spec / PO** | Refine the request into EARS requirements; kill ambiguity. | New spec or change proposal with delta. | Spec approval. |
| Plan | **Plan / Architect** | Produce `design.md` and `tasks.md`; surface architectural decisions. | Plan files + ADR drafts if needed. | Decisions on irreversible choices. |
| Execute | **Implement / Dev** | Implement tasks against the approved spec — or hand each task card to an executor subagent. | Code commits. | None (or PR review). |
| Verify | **Review / Tester** | Run lint, tests, security scans, `doctrina validate`; check cross-artifact consistency. | Pass/fail report. | None — read-only, may run as a subagent. |
| Curate | **Curator** | Merge applied deltas, archive the change, update the index. | Updated specs + cleaner archive. | None for mechanical work; human for any memory promotion (when `memory/` exists). |

These are **prompt personas**, not separate agents. Switching
persona means switching the framing prompt that the same
planner uses; the trace and the artifacts on disk are the
shared context across the switch.

### Read-only subagents

Safe to fan out:

- Codebase search ("find every call site of `processOrder`").
- Retrieval over prior changes or ADRs.
- Lint or test output parsing.
- Static security scanning (Semgrep, Bandit, etc.).
- Build log analysis.

Each subagent returns text. The planner decides what to do
with the text. These subagents never write to repository artifacts;
the one that writes is an executor, holding a card.

### Human approval gates

Doctrina has two natural human-in-the-loop checkpoints:

- After spec drafting and before implementation: the human approves
  the spec or the change proposal. This is where ambiguity gets
  killed.
- Before an architectural decision lands: the human approves or
  edits the ADR before its status flips from `proposed` to
  `accepted`.

A human-in-the-loop gate is not a multi-agent feature; it is the
absence of one. The planner pauses, the human reads, the
planner resumes.

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
- The planner (whichever tool) closes the change.

Each agent owns one phase. None overlaps with another. The artifacts
in `.doctrina/` are the shared trace.

## When the line gets blurry

| Situation | Verdict |
|-----------|---------|
| Two AI reviewers running concurrent read-only checks | Safe. Both are read-only; outputs are summaries. |
| Local lint + CI lint at the same time | Safe. Both are validators that produce reports, not artefacts in `.doctrina/`. |
| An agent and a human editing the same `proposal.md` | Hazard. Same artifact, two writers. Serialise. |
| Two changes in flight on disjoint capabilities | Safe. Different artifacts, no shared writer. |
| A subagent that "just patches a small file" | Hazard. The "small file" is a writer slot; the moment a subagent writes, it is an executor — give it a card and keep it the only writer in that repository. |
| An executor working a task card while the planner waits | Safe (ADR 0030). One writer in the repository; the planner reviews and closes. |
| Executors in `back-end` and `front-core` at the same time | Safe (ADR 0030). Different repositories, no shared artifact. |

## Related material

- [Workflow](workflow.md) — how a change moves through the phases.
- [The end-to-end flow](end-to-end-flow.md) — the roles above, step by
  step, for work that crosses repositories.
- [Antipatterns](antipatterns.md) — section 3 names the failure mode
  this doc helps you avoid.
- [Adapters](adapters.md) — how each supported agent finds
  `AGENTS.md`.
- [Work across repositories](workspace.md) — planner, executors and
  deliveries in practice.
- ADR 0030 — one planner, one writer per repository, executors on
  self-contained cards (supersedes ADR 0004).
