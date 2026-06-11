# AGENTS.md — Express retrofit demo

Operational source of truth for AI coding agents. Open AGENTS.md
standard. Brownfield project; Doctrina was added as a retrofit.

## What this repo is

A minimal Express service exposing a rate-limit (quota) endpoint.
Example project for the Doctrina framework demonstrating the
brownfield adoption path.

## Stack and tooling

- Runtime: Node.js 20.12+
- Web framework: Express 4
- Language: TypeScript
- Storage: in-memory map (no persistence; documented in ADR 0002)

## Commands

```
# install
npm install

# run
npm start

# Doctrina checks
doctrina validate
doctrina clarify .doctrina/specs/api-quota/spec.md
```

## Repository structure

```
AGENTS.md                       this file
CLAUDE.md                       Claude Code adapter
.cursor/rules/00-doctrina.mdc   Cursor adapter
package.json
src/
  server.ts                     Express app
.doctrina/                      framework artifacts (retrofitted)
```

OpenAI Codex CLI reads `AGENTS.md` natively, so no separate
adapter file is installed for it.

## Conventions and boundaries

- Only one capability is currently spec'd (`api-quota`). Other
  endpoints exist in code without specs; add a spec when you
  touch a new capability (brownfield rule).
- Do not generalise the rate-limit logic without an ADR.
- Specs use EARS. ADRs are immutable; supersede to change.

## How to read context efficiently

1. Read this `AGENTS.md`.
2. Read `.doctrina/product.md`.
3. Read `.doctrina/specs/api-quota/spec.md`.
4. Read the two ADRs under `.doctrina/decisions/` — both are
   retroactive discoveries.
5. Read the archived change folder under
   `.doctrina/changes/archive/` — uses the bug-spec pattern.

## Brownfield notes

- ADRs are tagged with "discovered while reading code" where the
  original decision rationale was recovered, not authored.
- Specs are spec'd just-in-time, not back-filled for every
  capability.
- The rest of the codebase has no specs yet; that is intentional.
