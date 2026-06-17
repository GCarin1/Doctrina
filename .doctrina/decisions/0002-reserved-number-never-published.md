# ADR 0002 — Reserved number, never published

- **Status:** withdrawn
- **Date:** 2026-06-11
- **Deciders:** project owner
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** n/a — withdrawn, never published

## Context

The foundation commit of this repository created ADRs 0001, 0003, and
0004 directly; the number 0002 was consumed by a draft that was dropped
before the foundation was committed and never reached `proposed` status.
The gap in the sequence is therefore original, not the result of a
deleted artifact.

ADR numbering in Doctrina is sequential and ADRs are immutable. A silent
gap in the sequence invites exactly the wrong inference — that a decision
record was removed from history — and costs every future reader an
investigation that ends nowhere.

## Decision

Record this tombstone under the reserved number. It carries no
architectural decision; its only purpose is to make the numbering
auditable. The next available ADR number remains the highest existing
number plus one (the CLI computes this from the files on disk).

## Consequences

**Positive**

- The decisions sequence is contiguous and self-explaining; "why is
  0002 missing?" is answered by the artifact itself.

**Negative**

- One file in `decisions/` carries no decision. The `withdrawn` status
  keeps it out of the accepted set agents are told to read.

**Neutral**

- The "three accepted ADRs" count in README and AGENTS.md is unchanged:
  0001, 0003, and 0004 remain the accepted set.
