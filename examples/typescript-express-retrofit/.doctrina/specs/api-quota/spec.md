# Spec — api-quota

**Capability:** api-quota
**Status:** active
**Last updated:** 2026-06-02
**Version:** 0.1.0
**Origin:** spec'd just-in-time per the brownfield rule when a
quota-bypass bug was discovered (see archived change
2026-06-02-0001-fix-quota-bypass).

## Purpose

Enforce a per-API-key request quota inside a rolling time window.

## Requirements (EARS)

### Ubiquitous

- The system shall expose a POST endpoint at `/quota/:apiKey`
  that returns whether the calling key may proceed.
- The system shall maintain a per-key counter that resets after a
  fixed window (60 seconds for v0).
- The system shall reject requests with an api-key shorter than
  eight characters with HTTP 400.

### Event-driven

- When a request arrives for an api-key whose counter has not
  reached the limit, the system shall increment the counter and
  respond with HTTP 200 and the remaining quota.
- When a request arrives for an api-key whose counter has
  reached the limit, the system shall respond with HTTP 429 and
  a JSON body with `remaining: 0`.
- When the rolling window for a key has elapsed, the system shall
  reset the counter on the next request for that key.

### State-driven

- While the process is running, all counters are held in memory.
  Restarting the process clears all counters; this is documented
  in ADR 0002.

### Unwanted-behavior (must-not)

- The system shall not log the api-key at any level. It is a
  credential.
- The system shall not allow the counter to go negative under
  any race condition.

## Acceptance criteria

1. First 100 requests in a window with the same valid api-key
   return HTTP 200 with monotonically decreasing `remaining`.
2. The 101st request in the same window returns HTTP 429.
3. After 61 seconds the next request returns HTTP 200 with
   `remaining: 99`.
4. A request with an api-key of 7 characters returns HTTP 400.

## Out of scope for this spec

- Cross-instance coordination (this v0 is single-process).
- Per-route quota differentiation. v0 has one limit for all.
