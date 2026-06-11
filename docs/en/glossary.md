# Glossary

Short definitions of the terms Doctrina uses. Sources are linked
where they are non-obvious.

## ADR — Architecture Decision Record

A short document (one to two pages) that records a single
architecturally significant decision: title, status, context,
decision, alternatives, consequences. Doctrina uses the
[Nygard format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
and the [MADR](https://adr.github.io/madr/) extensions for
explicit alternatives. Once `Status: accepted`, an ADR is immutable
except for its `Status:` and `Superseded by:` headers.

## AGENTS.md

An open standard for the operational source-of-truth file at a
project root. Introduced by OpenAI in August 2025, donated to the
Linux Foundation's Agentic AI Foundation in December 2025. Adopted by
Codex, Cursor, Claude Code (via `CLAUDE.md` import), Copilot, Devin,
Gemini CLI, and 60,000+ open-source projects. Doctrina builds on
this standard rather than inventing its own (ADR 0001).

## Adapter

A thin pointer file installed by `doctrina init --agent <name>` that
routes an agent which prefers a different filename (such as Claude
Code's `CLAUDE.md` or Cursor's `.cursor/rules/*.mdc`) to the
canonical `AGENTS.md`. Adapters carry no rules of their own and are
capped at 30 lines.

## Apply

The action of merging a change's spec deltas into the affected
specs. ADDED deltas write a new spec file. REMOVED deltas delete a
spec file. MODIFIED deltas require a manual merge.

## Archive

The act of moving an applied change folder from
`.doctrina/changes/<id>/` to
`.doctrina/changes/archive/YYYY-MM-DD-<id>/`. Archived changes
become episodic memory and leave the agent's default read path.

## Brownfield

A project where Doctrina is introduced into an existing codebase
with running tests, real users, and incumbent conventions. Contrast
with greenfield. OpenSpec calls itself "brownfield-first"; Doctrina
inherits that posture.

## Capability

The unit of truth in a Doctrina spec set. A capability is a coherent
slice of system behaviour ("billing", "authentication", "search") and
has exactly one `spec.md` at any time. The capability slug must match
`[a-z][a-z0-9-]*`.

## Change

A unit of work. Lives in `.doctrina/changes/<id>/` while active and
in `.doctrina/changes/archive/YYYY-MM-DD-<id>/` after it is applied.
Contains `proposal.md`, `tasks.md`, `design.md`, and zero or more
spec deltas under `specs/<capability>/delta.md`.

## CLAUDE.md

The file Claude Code reads automatically when it starts in a
project. Doctrina's Claude adapter is a thin `CLAUDE.md` that
`@`-imports `AGENTS.md`.

## Delta

A spec change packaged inside a change folder. Carries an
`Operation:` header (`ADDED`, `MODIFIED`, or `REMOVED`) and a target
spec path. ADDED and REMOVED deltas are applied automatically by
`doctrina change apply`. MODIFIED deltas require human merge.

## Dogfooding

Using a tool to build the tool. Doctrina's own repository is built
using Doctrina from commit 1 — every commit reflects a real exercise
of the workflow.

## EARS — Easy Approach to Requirements Syntax

A small grammar for writing requirements in five forms:
ubiquitous (`the system shall...`), event-driven (`when X, the system
shall...`), state-driven (`while X, the system shall...`),
unwanted-behaviour (`the system shall not...`), and optional
(`where X, the system may...`). Doctrina spec templates use EARS
section headings.

## Greenfield

A project built from scratch with Doctrina from day one. Contrast
with brownfield. Most SDD frameworks shine in greenfield and
struggle in brownfield; Doctrina aims for both.

## Index

`.doctrina/index.json`. The single JSON file that catalogues every
artifact (specs, decisions, open changes, archived changes) with id,
path, status, version, and dates. Read by `doctrina validate`.

## MADR

A modern ADR template that extends Nygard's original with explicit
alternatives. Doctrina's `decision.md.template` is MADR-adjacent.

## Memory (episodic, semantic, procedural)

The agent-memory literature
([CoALA](https://arxiv.org/abs/2309.02427) and follow-up work from
Princeton) splits durable knowledge into three types:

- **Episodic memory** — the log of what happened. In Doctrina, the
  archived change folders under `.doctrina/changes/archive/` are
  episodic.
- **Semantic memory** — what is true now. In Doctrina, the
  capability specs under `.doctrina/specs/` are semantic, and the
  accepted ADRs under `.doctrina/decisions/` are semantic decisions.
- **Procedural memory** — how to act. In Doctrina, `AGENTS.md` and
  the per-agent adapters are procedural.

What distinguishes "remembering" from "learning" is the
consolidation step: repeated episodic experiences are promoted to
semantic memory (a recurrent gotcha becomes a spec requirement, a
recurrent design choice becomes an ADR). Without that consolidation
discipline, episodic memory just accumulates. This is the failure
mode ADR 0003 cites when it defers a `memory/` folder.

## Materialise

Used in this codebase to mean "write a delta body to its target
spec path during apply." A materialised spec is the active truth
produced by an ADDED delta.

## Orchestrator

The component that coordinates the workflow phases. Doctrina's
reference orchestrator is a single linear loop (ADR 0004). It may
fan out subagents for read-only investigation but never for parallel
writing. See [multi-agent.md](multi-agent.md) for the operating
model.

## Propose

The act of opening a change with `doctrina change new`. The change
starts at `Status: proposed`. A proposal becomes `applied` only when
`doctrina change apply` finishes without errors and without manual
MODIFIED deltas.

## Spec

`.doctrina/specs/<capability>/spec.md`. The canonical description
of how a capability works today. Uses EARS for requirements. Updated
by applying deltas, never edited freehand outside the change
workflow.

## Skill

`.doctrina/skills/<slug>.md`. On-demand procedural memory: a
short, specialised "how to do X well" file an agent loads only
when a specific task matches. Frontmatter carries `name`,
`description`, and `when` fields so agents can decide cheaply
whether to load the full body. Complements `AGENTS.md`
(procedural-always) without replacing it. See
[skills.md](skills.md) for design and per-agent loading
semantics.

## Spec-driven development (SDD)

A development discipline in which specifications are the source of
truth and code is a generated or verified secondary artifact.
Surveyed in detail by Spec Kit, OpenSpec, Kiro, BMAD, SpecWeave,
and other frameworks. Doctrina is one synthesis of the lessons
from that body of work.

## Supersede

The act of replacing an accepted ADR with a new ADR. The old ADR
keeps its body and gets `superseded by NNNN` in its `Status:`
header. The new ADR carries `Supersedes: <old>`. The two are linked
bidirectionally.

## Validate

`doctrina validate`. Runs schema and structural checks against the
`.doctrina/` tree. Exits 0 on no errors. Intended for pre-commit
hooks.
