# ADR 0002 — In-memory rate-limit for v0 (discovered)

- **Status:** accepted (rationale partially recovered)
- **Date:** 2026-06-02 (discovered while reading code)
- **Original decision date:** unknown, prior to Doctrina adoption
- **Deciders:** retrofit team
- **Supersedes:** —
- **Superseded by:** —

## Context

The quota implementation in `src/server.ts` uses an in-memory
`Map<string, Bucket>`. This works for a single-instance service
but does not survive a restart and does not coordinate across
instances. The retrofit team needed to either document why this
is acceptable or supersede it.

Interviews with the original author surfaced one reason: the
service originally ran behind a sticky load balancer with a
single replica. Coordination was not required. Persistence
across restarts was deemed acceptable because quota state is
soft (recently throttled keys would simply get fresh quota
after a restart, which is a benign error mode).

Whether this is still true today is another question, but the
question is beyond the scope of the bug-fix change that
triggered this ADR.

## Decision

Document the in-memory choice as accepted for v0, with the two
implicit assumptions explicitly named: single-replica deployment
and acceptable-fresh-quota-on-restart.

## Alternatives considered

1. **Redis-backed counter.** Solves persistence and
   coordination. Rejected for v0 because it would have required
   infrastructure work outside the retrofit's bug-fix scope.
2. **SQLite-backed counter.** Solves persistence; does not solve
   coordination. Rejected because it would mask the
   single-replica assumption rather than name it.
3. **Document the in-memory choice and its assumptions.**
   Accepted.

## Consequences

**Positive**

- The retrofit ships without infrastructure changes.
- Assumptions are now visible to future readers.

**Negative**

- Any future move to multiple replicas requires this ADR to be
  superseded.

**Neutral**

- An incident showing the assumption breaking (e.g. a deploy
  causing a spike of fresh quota for all keys) would trigger a
  supersession.
