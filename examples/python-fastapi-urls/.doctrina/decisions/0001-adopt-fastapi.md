# ADR 0001 — Adopt FastAPI for the v0

- **Status:** accepted
- **Date:** 2026-06-01
- **Deciders:** project owner
- **Supersedes:** —
- **Superseded by:** —

## Context

The demo needs a Python HTTP framework. The candidates considered
were Flask, FastAPI, and Litestar. The project is greenfield, has
no incumbent dependency, and is sized for a single owner.

The Doctrina docs argue that an example should show the framework
in context, not be a production system. The HTTP framework choice
must therefore optimise for clarity and small surface, not for
peak throughput.

## Decision

The v0 of this example uses FastAPI.

## Alternatives considered

1. **Flask.** Mature and minimal, but its request validation is
   manual; the example would need extra code to validate the
   request body. Rejected for verbosity.
2. **Litestar.** Modern and fast, with good typing. Rejected
   because adoption is lower; an example using a less-known
   framework adds friction for readers learning Doctrina, not
   Litestar.
3. **FastAPI.** Type-driven request validation through Pydantic;
   minimal boilerplate; the most widely-recognised modern Python
   web framework. Accepted.

## Consequences

**Positive**

- Body validation is one line (`url: HttpUrl`) instead of a hand-
  written validator.
- The example reads naturally to most Python web developers.

**Negative**

- Adds a transitive dependency on Pydantic. For a Doctrina
  example we accept this; for the framework itself we would not.

**Neutral**

- The example pins FastAPI ≥ 0.110; that range covers the
  current API shape.
