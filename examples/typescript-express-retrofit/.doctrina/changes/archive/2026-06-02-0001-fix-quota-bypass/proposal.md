# Change 0001 — Fix quota bypass for keys shorter than 8 characters

- **Status:** applied
- **Applied:** 2026-06-02
- **Date:** 2026-06-02
- **Owner:** retrofit team
- **Affects specs:** api-quota (new capability — ADDED, scoped to the bug)
- **Materialised spec:** `.doctrina/specs/api-quota/spec.md`

## Why

A user reported that requests with a one-character api-key were
counted against an empty-string bucket rather than rejected. This
turned api-keys into an optional input, which is the bypass.

The team had no spec for quota when the bug was reported. Per
the brownfield rule, this change spec'd the capability
just-in-time using the bug-spec three-section pattern.

## Bug-spec

### Current behaviour

POST /quota/x (a one-character api-key) increments the counter
keyed on `"x"` and returns HTTP 200. POST /quota/ returns the
404 path-mismatch from Express because the route requires the
parameter; but inside the handler the api-key length was never
validated, so any short string passed.

### Expected behaviour

POST /quota/:apiKey with an api-key shorter than 8 characters
returns HTTP 400 with a JSON body explaining the requirement.

### Unchanged behaviour

- HTTP 200 with the existing `remaining` counter for valid keys.
- HTTP 429 with `remaining: 0` for over-quota valid keys.
- Per-key counter reset after the 60-second window.

## What

Validate `apiKey.length >= 8` at the start of the handler. Reject
with HTTP 400 and the explanation if the check fails. Spec the
capability fully in the same change because the team will own
it going forward.

## Scope boundaries

- This change does not alter the window length.
- This change does not rate-limit unauthenticated traffic.
- This change does not introduce persistence; the in-memory
  choice is documented in ADR 0002.

## Verification

- POST /quota/short (5 characters) returns HTTP 400.
- POST /quota/longenough (10 characters) returns HTTP 200.
- The existing 100-requests-per-window flow continues to work.

## Open questions

None.
