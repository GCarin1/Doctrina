# ADR 0018 — Exit codes are a machine contract with five classes

- **Status:** accepted
- **Scope:** cli
- **Date:** 2026-08-06
- **Deciders:** GCarini + agent session of 2026-08-06 (audit remediation v2)
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** `packages/doctrina-cli/src/lib/exit-codes.js`, `packages/doctrina-cli/src/index.js`
- **Landed:** 2026-08-06 — covered by `packages/doctrina-cli/test/exit-codes.test.js`

## Context

Swept across all commands, exit code `1` carried three unrelated meanings:

| meaning | example |
|---|---|
| a gate failed — the work is not ready | `validate`, `analyze`, `close` |
| a precondition is missing — the project is not configured | `verify` with no `verify.json`, `intake` with none stored |
| the environment cannot run this | `metrics` on a repo with no commits |

The first means iterate; the second means run a different command first;
the third means stop. A machine consumer reading `1` cannot tell them
apart, so an autonomous loop either spins on an unfixable failure or
abandons a fixable one. A stray `3` also existed in the codebase with no
documented meaning (a scoring helper, not an exit path).

Doctrina's premise is that the primary operator is an agent. An exit code
is the narrowest, cheapest channel that agent has.

## Decision

Five classes, defined once in `src/lib/exit-codes.js`, referenced by every
command, and printed by `doctrina --help`:

| code | class | what the agent should do |
|---|---|---|
| 0 | OK | continue |
| 1 | GATE | fix the work, retry the same command |
| 2 | USAGE | do not retry unchanged; correct the invocation |
| 3 | PRECONDITION | run the setup command named in the error, then retry |
| 4 | ENVIRONMENT | stop; retrying will not help |

Preconditions and environment failures are raised as typed errors
(`PreconditionError`, `EnvironmentError`) carrying an optional remedy
command. The entrypoint maps a typed error to its class and prints the
remedy; an untyped throw stays `GATE`, because an unexpected failure of
the work is a problem with the work.

"Not a Doctrina project" — the most common precondition, raised by nearly
every command — has a single constructor, so its message and its code are
identical everywhere.

## Alternatives considered

1. **Keep one failure code and put the class in the message.** Rejected:
   it forces every consumer to parse English, which is the failure mode
   `--json` and this ADR both exist to remove.
2. **A wider set of codes, one per condition.** Rejected: the useful
   question is "what should I do next?", which has four failure answers.
   More codes would carry information no consumer acts on differently.
3. **Reuse sysexits.h conventions (64, 78, ...).** Rejected: those are a
   Unix C convention with no meaning to the agents and CI systems that
   consume this CLI, and they read as arbitrary in a help table.

## Consequences

**Positive**

- An agent can branch on the code alone: iterate, correct, set up, or stop.
- With `--json` (M7), the pair forms a complete machine contract:
  structured output plus a meaningful status.
- The mapping is testable, and is tested per class.

**Negative**

- A behaviour change for anyone scripting `[ $? -eq 1 ]` against
  `verify`/`intake` misconfiguration; those now return 3. This is a
  pre-1.0 CLI and the change is in the changelog and the upgrade guide.
- Every new command has one more thing to get right. The test that audits
  literal returns against the enum is the guard.

**Neutral**

- Codes 0 and 2 keep their previous meanings, so most consumers see no
  change.
