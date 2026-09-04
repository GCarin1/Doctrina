# Contract — system

**Contract:** system
**Status:** active
**Last updated:** 2026-09-03

## Purpose

<!--
Doctrina is a CLI, not a service: it listens on no port, opens no socket,
and makes no network call. Its integration surface is therefore small and
unusual — it is entirely the RELEASE path and the two ceilings that bound
what an agent always loads.

The Ports and Selectors sections the template ships are deleted rather
than filled with placeholders: this project has no instance of either,
and a table of invented rows would be worse than an absent one.
-->

The release/publish surface (what CI must inject for `npm publish` to
work) and the always-loaded context ceilings that bound every session.

## Environment

<!--
One variable, and it only exists during a tag-triggered release. There is
no `.env.example` in this repository because nothing runs locally that
needs one — the env-drift check has nothing to compare against, by design.
-->

| Variable        | Required | Values | Example                    |
|-----------------|----------|--------|----------------------------|
| NODE_AUTH_TOKEN | yes      | —      | npm_xxxxxxxxxxxxxxxxxxxx   |

## Wiring

<!--
The rename here is DELIBERATE and is the reason this row exists.

npm reads its credential from `NODE_AUTH_TOKEN` — the name is npm's, not
ours — while the repository secret is named `NPM_TOKEN`. So the workflow
exports one name from the other, and `contract check` reports RT02: "the
names differ, so renaming one silently empties the other".

That warning is correct and worth keeping visible. If someone renames the
GitHub secret, `${{ secrets.NPM_TOKEN }}` resolves to the empty string,
`npm publish` receives a blank credential, and the failure surfaces as an
authentication error with nothing pointing at the rename. This row is
what makes that chain findable.

Consumer is intentionally blank: the reader is npm itself, not a file in
this repository, so there is no source to lint for empty-vs-unset (RT03).
-->

| Variable        | Origin  | Workflow                      | Job/Step | Consumer |
|-----------------|---------|-------------------------------|----------|----------|
| NODE_AUTH_TOKEN | secrets | .github/workflows/release.yml | publish  |          |

## Budgets

<!--
Both of these are ceilings that get hit while adding a feature, and both
have exactly one honest response: send less. They are recorded here so
that "just raise the cap" becomes an argument someone has to win rather
than a diff nobody notices.

  agents-md-lines   AGENTS.md is loaded into EVERY session, so its size is
                    a tax on all work. `validate` warns past 150 and errors
                    past 200. Declared as OUTPUT: `analyze` refuses a change
                    that resolves an overflow by raising it. Cutting the
                    generated surface block twice in one release (0.15.0)
                    is what this row is meant to keep happening.

  context-pack      The token ceiling `doctrina context` assembles a pack
                    to (lib default; a project may override it via
                    index.json config.context_budget). INPUT: widening it
                    to fit more sources is a legitimate trade-off, so it is
                    documented here rather than gated.
-->

| Limit           | Direction | Value |
|-----------------|-----------|-------|
| agents-md-lines | output    | 150   |
| context-pack    | input     | 15000 |

## Interfaces

<!--
The CLI's own machine-facing contract. These are specified in full in the
capability specs referenced below; listed here because they are what an
external consumer (a CI job, another agent) actually integrates against.
-->

- **Exit codes** — a five-class contract (ADR 0018): `0` ok, `1` gate
  failed, `2` usage error, `3` precondition missing, `4` environment
  cannot run. Consumers branch on the code, never on the prose.
- **`--json`** — every command emits a stable envelope carrying the
  schema version, so a machine consumer never parses human output.
- **The composite action** (`action.yml`) — runs `validate`,
  `index rebuild --check`, `coverage` and `trace`. Note that it does NOT
  run `verify`: the build gate is the project's own to run.

## References

- `specs/scaffolding`
- `specs/gates`
- `specs/cli`
