# ADR 0005 — Agent-executed playbooks for `intake` and `work`

- **Status:** accepted
- **Date:** 2026-06-12
- **Deciders:** project owner
- **Supersedes:** —
- **Superseded by:** —

## Context

The manual surface of the v0 workflow is its biggest adoption tax. To go
from a raw project description to working code, the user must hand-drive
every step: fill `product.md`, decide the capability list, run `spec new`
once per capability, author EARS requirements, open a change, write the
delta and tasks, then apply and archive. Users asked for two shortcuts:

1. After `init`, hand over the **full** project description once and have
   the framework turn it into `product.md` plus capability specs.
2. For day-to-day work, give a **brief prompt** ("add login") and have the
   framework produce every `.doctrina/` artifact the change needs and
   drive the implementation from them.

Both shortcuts require natural-language interpretation, which collides
with three standing invariants: the CLI has zero runtime dependencies
(cli spec), makes no network calls and emits no telemetry (cli spec),
and Doctrina is a context substrate, not an agent runtime (product.md
non-goals). The intelligence has to live somewhere.

## Decision

The CLI does the **deterministic** half and prints a **playbook** for the
rest. A playbook is a fixed, ordered instruction sequence written for the
AI coding agent that invoked the command; the agent — which already has
an LLM, the repo, and the AGENTS.md rules — executes the interpretation
steps the CLI cannot.

- `doctrina intake <file>` stores the raw description verbatim at
  `.doctrina/intake.md` (status `pending`) and prints the bootstrap
  playbook: fill `product.md`, derive capabilities, `spec new` + EARS per
  capability, run the quality gates, flip the intake to `converted`.
- `doctrina work "<prompt>"` derives a sequential change id from the
  prompt, scaffolds the change folder, records the prompt under the
  proposal's `## Why`, ranks existing specs by deterministic term
  overlap, and prints the work playbook: context → delta → tasks →
  implement → analyze → apply → archive → validate.

The CLI's own natural-language processing is capped at slugging and
case-insensitive term counting. Everything semantic is the agent's job.

## Alternatives considered

1. **Call an LLM API from the CLI.** Rejected: adds a runtime dependency,
   network calls, and key management; breaks the offline invariant; and
   duplicates the model the invoking agent already has.
2. **Heuristic NL parsing inside the CLI.** Rejected: keyword-driven
   capability extraction produces low-quality specs while presenting
   them with the CLI's authority; bad truth is worse than no truth.
3. **Do nothing; document the manual flow better.** Rejected: the
   friction is structural, not educational — the command count per
   feature stays the same no matter how good the docs are.

## Consequences

**Positive**

- Both invariants hold: zero deps, zero network. The CLI remains testable
  with plain `node --test` and works air-gapped.
- Agent-agnostic by construction: any AGENTS.md-aware agent can execute a
  playbook; nothing is tuned to one vendor.
- The playbook is inspectable and versioned with the CLI — the "prompt"
  driving the conversion is reviewable like any other artifact.

**Negative**

- Output quality depends on the executing agent; the CLI can gate
  (`clarify`, `validate`, `analyze`) but not guarantee.
- A human running `intake`/`work` without an agent receives instructions
  addressed to software; the playbook must stay readable as a checklist.

**Neutral**

- The single linear orchestrator discipline (ADR 0004) is unchanged: a
  playbook is consumed by one agent in one pass, never fanned out.
