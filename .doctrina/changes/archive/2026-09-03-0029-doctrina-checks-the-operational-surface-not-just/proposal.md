# Change 0029-doctrina-checks-the-operational-surface-not-just — Doctrina checks the operational surface, not just prose

- **Status:** applied
- **Applied:** 2026-09-03
- **Date:** 2026-09-03
- **Owner:** Gcarini
- **Affects specs:** cli, gates, templates, validation, skills, docs

## Why

A field evaluation of Doctrina 0.14.0, written by an agent using it on a
downstream repo (Behave + GitHub Actions + dotenv), reached one verdict:
Doctrina is strong as product memory and a scope brake, weak as runtime
guidance. Spec, ADR and skill describe the *what* and the *never again*.
They almost never describe how a workflow, a dotenv default, a test
selector or a hook order actually behaves — so the agent reads YAML, logs
and source by hand, and only afterwards records the lesson. That inverts
the promised value.

The concrete failure class: the index assumes truth lives in versioned
Markdown, while operational truth lives in a job's `env:` block, in an
absent `${{ vars.X }}` collapsing to the empty string (so a
`getenv(name, default)` default never applies), in an enum the contract
declares but the code never validates, in hook ordering, and in a test
selector that matches zero cases and still exits 0. None of that is EARS,
and no gate could see it.

## What

Teach Doctrina to check the operational surface *as declared*, without
learning any single CI system or test runner (SC1: no runtime deps).

- **New `lib/runtime.js`** — the runtime declaration model: parses the
  contract's Wiring, Selectors and Budgets sections plus the extended
  Environment columns, and produces coded findings with remedies.
- **`contract check` binds declarations to implementation** — a flag
  declared with an origin must appear in the named workflow's `env:`;
  the consumer must not use a default-arg getenv pattern for a value CI
  can inject empty; declared enums must agree across contract, example
  and consumer.
- **New `doctrina triage`** — classifies a request into a lane (product
  / runtime / chore) before anything is scaffolded, and with no prompt
  runs the runtime recipe set. `work` consults it, `next` becomes
  lane-aware, `doctor` drives it as one more row.
- **`verify` gains output expectations** — a check that exits 0 having
  executed nothing fails the gate, declared per check, runner-agnostic.
- **`validate` gains ordered pipeline requirements** — a Pipeline block
  whose consumer step requires an artifact no earlier step produces is an
  error; and skills whose `when:` carries no detectable trigger warn.
- **`context` ranks skills**, `skill suggest` drafts from an error, and
  `analyze` refuses a change that resolves a budget overflow by raising
  the declared output ceiling.

## Scope boundaries

- No CI system, test runner or language is parsed natively. Every runtime
  check reads a project-supplied declaration (glob, pattern, origin,
  expectation). Behave and GitHub Actions are examples in docs, never code
  paths — the non-goal "not a CI/CD system, not a test framework" holds.
- No network, no new runtime dependency.
- Doctrina still does not judge semantic fidelity: the empty-as-unset
  check is a textual lint on a declared consumer, not program analysis,
  and says so in its finding.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Every runtime check is proven on a fixture that fails before the change and passes after.
- [x] The new command surface is reachable from the catalog, help, completions and docs.

## Open questions

None — scope and the runner-agnostic constraint were settled with the
requester before implementation.
