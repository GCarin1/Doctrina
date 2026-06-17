# ADR 0003 — Defer the `memory/` folder to a post-v1 milestone

- **Status:** accepted
- **Date:** 2026-06-03
- **Deciders:** project owner
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** n/a — deferral decision; the deliberate absence of a `memory/` folder is the artifact

## Context

The architectural research that motivated Doctrina proposed an optional
`.doctrina/memory/` folder to hold consolidated semantic knowledge
(lessons, heuristics, gotchas) that does not belong in specs or ADRs. The
research itself flagged this folder as the most dangerous component of
the design for three independent reasons:

1. **Empirical risk of negative ROI.** Gloaguen et al. (ETH Zurich /
   LogicStar.ai, *Evaluating AGENTS.md*, arXiv:2602.11988, February 2026,
   AGENTbench: 138 instances across 12 Python repositories derived from
   5,694 PRs) measured that LLM-generated context files **reduced** task
   success (−0.5% on SWE-bench Lite, −2% on AGENTbench) and increased
   inference cost by 20–23%. Human-written context files improved success
   by only ~4% on average at +19% cost, and degraded Claude Code in
   particular. More AI-generated documentation can make outcomes worse.
2. **Curation collapse.** The wider memory literature (CoALA, Princeton)
   notes that without disciplined curation, semantic memory becomes a
   "drawer of clutter." A `memory/` folder populated by an automated
   Curator agent without a human gate is the canonical failure mode.
3. **Lost-in-the-middle drag.** Loading more low-density context degrades
   long-context model performance by >30% (Liu et al., Stanford/UW).
   Coding agents accumulate context and sit in the worst case.

The original research recommended adding `memory/` only in Stage 2, "with
measured pain." The Doctrina owner chose the full scalable architecture
(Stage 3) but explicitly opted to defer `memory/` per this empirical
caution.

## Decision

Doctrina v0 and v1 will not ship a `.doctrina/memory/` folder. Consolidated
knowledge that would otherwise live in `memory/` must instead be either
(a) promoted into a relevant `specs/<capability>/spec.md`, or (b) recorded
as an ADR if it is a decision, or (c) left out.

The folder may be introduced in v2 or later only when **both** of the
following are true:

- A measurable failure mode exists that specs and ADRs cannot absorb.
- A human curation gate is in place (no automatic writes from an agent).

## Alternatives considered

1. **Ship `memory/` in v1 with human curation.** Rejected. Adds complexity
   before there is evidence the project needs it.
2. **Ship `memory/` in v1 with automated Curator agent.** Rejected. Directly
   reproduces the ETH Zurich negative-ROI scenario.
3. **Ship `memory/` only as a documentation hint, no folder, no tooling.**
   Considered. Rejected as confusing — either Doctrina supports the concept
   or it does not.

## Consequences

**Positive**

- Doctrina v0/v1 avoids the most evidence-supported failure mode of
  SDD frameworks.
- Smaller surface area to document, validate, and maintain.
- Forces clean discipline: every fact must justify itself as either spec or
  decision.

**Negative**

- Users with a legitimate need for consolidated lessons-learned will hit a
  gap and may improvise (a `docs/lessons.md` or similar) outside Doctrina's
  rules. Doctrina should monitor this and revisit in v2.
- The framework cannot claim a "complete memory hierarchy" in marketing.

**Neutral**

- The decision is explicitly revisitable. This ADR will be superseded if
  v2 introduces `memory/`.
