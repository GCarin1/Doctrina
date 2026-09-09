# ADR 0025 — Command modules render; shared logic lives in lib

- **Status:** accepted
- **Date:** 2026-09-07
- **Deciders:**
- **Scope:** cli, gates
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** `packages/doctrina-cli/src/lib/snapshot.js`, `packages/doctrina-cli/src/lib/views.js`, `packages/doctrina-cli/test/one-collector.test.js`
- **Landed:** 2026-09-07

## Context

The CLI grew by adding a command per question. `status`, `prime`, `handoff`
and `report` all answer "where do things stand?" in different shapes, and
each collected the tree for itself. Where one needed a collection another
already had, it imported the function out of that command's module:
`prime` reached into `status` for `collectStatus`, `handoff` and `report`
reached into `prime` for `openChanges`, and all three reached into
`coverage` and `trace` for their summaries.

Twenty such edges existed across fourteen modules. Two consequences, one
visible and one waiting:

- **Four surfaces could disagree.** Nothing forced them to be views of the
  same collection, so a change to one command's collector silently changed
  what three other commands reported — or did not, which is worse.
- **The dependency graph had already inverted.** `lib/scan.js` imported
  `parseFrontmatter` from `commands/skill.js` and `lib/gates.js` imported
  `collectAnalysis` from `commands/analyze.js`. A library depending on a
  command is a cycle waiting for its second edge.

The framework's own thesis is that a fact has ONE home. The code did not
follow it.

## Decision

A module under `src/commands/` is a RENDERER. It parses flags, calls into
`src/lib/`, prints, and returns an exit code. It is not a data source.

Concretely:

1. **No command module imports a binding from another command module.**
   Shared logic moves to `src/lib/` and both read it from there.
2. **No library module imports from a command module**, in any form.
3. **Driving another command is exempt and explicit.** `close`, `watch`
   and `upgrade` invoke other commands' `run()` through a namespace import
   (`import * as validate from "./validate.js"`). That is the documented
   driver pattern — sequencing whole commands, not reaching into their
   internals — and it stays.
4. **A command MAY re-export what it renders** (`export { summarize } from
   "../lib/trace-model.js"`), so an existing consumer keeps working while
   the truth lives in one place.

Read-only state is collected once per invocation by
`lib/snapshot.js#collectSnapshot`, and every view is a pure function of
that snapshot in `lib/views.js`.

## Alternatives considered

1. **Leave the imports and add a test that the numbers match.** Rejected:
   it pins today's outputs without removing the cause, and a matching test
   over four renderings is a fixture-maintenance burden that grows with
   every field.
2. **Collapse the four commands into `status --view` and drop the names.**
   Rejected here: `prime` is what `AGENTS.md` tells every agent to run at
   session start, and `handoff` is named in the compaction workflow.
   Removing a name needs usage evidence, not a refactor's convenience —
   that decision belongs to the command-surface change, with the log to
   support it.
3. **Let libraries import from commands where it is convenient.**
   Rejected: two such edges already existed and the graph was one edge from
   a cycle. A direction rule only works if it has no exceptions.

## Consequences

**Positive**

- The four views cannot report different numbers: they share one
  collection, and a test asserts each renders byte-identically whether
  reached by its own command or by `status --view <name>`.
- The import rule is enforced, not remembered: a test fails on a named
  sibling import in `commands/` and on any `lib/ -> commands/` edge.
- A fifth view costs a function over the snapshot, not a fifth traversal.
- Testing shared logic no longer means booting a command.

**Negative**

- More files: nine `lib/` modules were carved out of command modules, so
  "where does this live" now has an extra hop for a reader who knew the old
  layout.
- The re-export lines are boilerplate; they exist to keep the old import
  paths working and are noise on the page.

**Neutral**

- The driver exemption means `import * as` and `import { }` from a sibling
  now mean genuinely different things. That distinction is the rule, and
  it is only obvious once stated — which is what this ADR is for.
