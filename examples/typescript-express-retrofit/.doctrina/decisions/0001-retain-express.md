# ADR 0001 — Retain Express (discovered, not authored)

- **Status:** accepted (rationale recovered from team interviews)
- **Date:** 2026-06-02 (discovered while reading code)
- **Original decision date:** unknown, prior to Doctrina adoption
- **Deciders:** retrofit team, on behalf of original authors
- **Supersedes:** —
- **Superseded by:** —

## Context

The codebase uses Express 4. The retrofit team considered whether
to keep Express or migrate to a modern alternative (Fastify,
Hono, Bun's native server). The decision had to be recorded
either way because future readers will ask the question.

The brownfield doc rule applies: if the original rationale can be
recovered (from team interviews, comments, commit history), the
ADR records it; if not, the ADR says so.

In this case, two reasons surfaced from short interviews:

1. The original authors picked Express because the rest of the
   team's services use it; switching one service would have
   created a polyglot maintenance cost.
2. The team's middleware library (authentication, logging,
   tracing) was written against Express's middleware signature.
   Migration cost is non-trivial.

## Decision

Retain Express 4 for the v0 of the retrofit. Re-evaluate when one
of:

- The other team services migrate.
- The middleware library is rewritten anyway.
- A specific Express limitation costs us a real incident.

## Alternatives considered

1. **Migrate to Fastify.** Modern, more performant, JSON-schema
   validation. Rejected because the middleware migration alone
   would have justified a separate change.
2. **Migrate to Hono.** Smaller surface, edge-friendly. Rejected
   for the same reason.
3. **Retain Express.** Accepted.

## Consequences

**Positive**

- Zero migration cost. The retrofit can ship with no behaviour
  change.
- Middleware library continues to work.

**Negative**

- Express 4's request/response shapes are dated. New code in
  this service inherits that shape.

**Neutral**

- A future ADR will supersede this one if any of the trigger
  conditions occur.
