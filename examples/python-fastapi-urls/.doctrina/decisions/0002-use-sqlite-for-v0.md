# ADR 0002 — Use SQLite for v0 storage

- **Status:** accepted
- **Date:** 2026-06-01
- **Deciders:** project owner
- **Supersedes:** —
- **Superseded by:** —

## Context

The demo needs persistence so that the `redirect` capability has
something to resolve. The candidates were SQLite (single-file,
embedded), Postgres (server, networked), and in-memory only.

Doctrina's design principles preach against premature complexity.
A demo that needs Postgres to run will be skipped by readers.

## Decision

Use SQLite, single file at the project working directory
(`urls.db`).

## Alternatives considered

1. **In-memory only.** The example would not survive a restart,
   which makes the `redirect` capability uninteresting. Rejected.
2. **Postgres.** Requires a running server. Rejected; it would
   make the example harder to run than it is to read.
3. **SQLite via `sqlite3` stdlib.** No new dependency, no server,
   one file on disk. Accepted.

## Consequences

**Positive**

- No new runtime dependency beyond the Python stdlib.
- The example runs after a single `pip install` and `uvicorn`
  command.

**Negative**

- SQLite would not be the right choice in production for this
  workload. A real adopter swapping in Postgres or a managed
  store would require a follow-up ADR (`0003 supersede 0002`).

**Neutral**

- The schema is two columns; no migrations required for v0.
