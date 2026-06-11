# Express retrofit demo — Product

## Vision

A minimal Express service that demonstrates Doctrina **brownfield**
adoption: the code already existed; Doctrina was added later.

## Problem

Adopting an SDD framework into a working codebase is harder than
adopting it into a greenfield project. The brownfield doc lays
out the rules; this example shows them in motion.

## Target users

- Developers evaluating Doctrina for an existing TypeScript
  backend.
- Readers of `docs/en/brownfield.md` who want to see retroactive
  ADRs, just-in-time specs, and the bug-spec workflow in a real
  (small) project.

## Scope

In scope:

- A POST /quota/:apiKey endpoint that consumes a token from a
  per-key rolling window.
- In-memory storage for the v0 (no persistence).

Out of scope:

- Other endpoints. The service has more routes in real life; the
  brownfield rule says we do not spec them until we touch them.
- Persistence, distributed quotas, cross-instance coordination.
- Production hardening, observability, tracing.

## Non-goals

This example is not a starting point for a production rate-limit
service. It is a Doctrina brownfield demo that happens to be one.

## Success criteria

The example succeeds when a reader can compare it to the
greenfield example and see how the artifact set differs —
specifically, why this `.doctrina/` tree is smaller (only one
spec) and how the ADRs are framed as discoveries rather than
authored decisions.
