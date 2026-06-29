# Deferred at v0.1.0

A register of features Doctrina considered and chose not to ship
at v0.1.0. Each item names a trigger that would justify
revisiting. The list exists so future contributors and external
users can distinguish "we have not done X" from "we considered X
and these are the reasons we did not."

This doc is a register of choices, not a roadmap. Items actually
planned for the next minor live in the CHANGELOG's Unreleased
section.

## Logo and visual identity

**Status:** resolved — mark chosen.

**Outcome:** this register set "a hosted landing page is built" as
the trigger, and the documentation site (GitHub Pages, served from
`docs/`) is that landing page. The owner picked the monogram —
`{D}`, doctrine inside the developer's braces — as the project
mark. It ships as plain SVG at `docs/assets/logo-monogram.svg` and
is used by the site shell, the landing pages, and the README.

## Telemetry and analytics

**Status:** rejected, not deferred.

**Why:** SECURITY.md commits to zero telemetry, zero analytics,
zero network calls as published policy. Adding any of those at
any later version would be a policy reversal that requires a new
ADR and a deprecation cycle.

**Trigger to revisit:** none planned. If the project ever ships
telemetry, the bar is an ADR superseding the silent-no-telemetry
posture, an opt-in (never opt-out) flag, a documented data
schema, and a documented retention policy.

## Translations beyond EN + PT

**Status:** deferred indefinitely.

**Why:** Each additional language adds 13 docs (the current EN
inventory) that must be kept in sync. PT was added because the
maintainer's primary working language is Portuguese; further
languages need a contributor willing to own the ongoing parity
work.

**Trigger to revisit:** a contributor commits to maintaining a
specific language indefinitely, or the validation A/B protocol
data shows a sustained adoption pattern in a language region
that justifies a new translation.

## IDE plugins and extensions

**Status:** out of scope.

**Why:** The AGENTS.md ecosystem and the twelve supported agents
(seven with thin pointer adapters — Claude Code, Cursor, Copilot,
Gemini CLI, Aider, Windsurf, Continue — and five AGENTS.md-native:
Codex CLI, Amp, Devin, Factory, Jules) cover the major
integration paths. A
Doctrina-specific IDE extension would be a separate product with
its own marketplace, build pipeline, and maintenance cycle —
beyond what a CLI framework should ship.

**Trigger to revisit:** none. Doctrina is the file-substrate
layer; IDE integration belongs to the agent and editor vendors.

## Auto-update mechanism for templates

**Status:** lifted — `doctrina templates update` shipped, with the
exact bar this register set: preview is the default (the command
writes nothing and exits 1 while updates are pending), `--write`
is the opt-in, and changes are additive-only (stub sections
appended, missing index fields added; existing content is never
rewritten or removed).

**What stays out:** silent or automatic updates. The command runs
only when invoked, and the conventions-repo pattern (documented in
`context-engineering.md`) remains the recommended path for
cross-project rule propagation.

## Performance profiling beyond synthetic benchmarks

**Status:** deferred until real adoption workloads exist.

**Why:** The bench script in `scripts/bench.js` shows
order-of-magnitude numbers. Deeper profiling (per-function CPU,
allocation patterns, cold-cache behaviour on specific
filesystems) requires real workloads from real projects, which
v0.1.0 does not yet have.

**Trigger to revisit:** a real adopter reports a latency that
the bench script does not predict, or the validation A/B
protocol surfaces validate as a bottleneck.

## Other items deferred or scoped out

- **`/checklist` quality-gate command.** The spec template's
  `## Acceptance criteria` section covers the use case. Trigger
  to revisit: someone proposes a checklist shape distinct from
  acceptance criteria.
- **Centralised constitution document — shipped in 0.10.0.** Rather
  than a separate `constitution.md` (a second home for facts already
  in the ADRs), `doctrina constitution` assembles the view on demand
  from the accepted ADRs plus the product non-goals. Read-only; owns
  nothing of its own.

## Accepted clarify smells

`doctrina clarify` flags weasel words and vague quantifiers.
Running it across every artifact in the tree surfaces two
acceptable categories of finding that the repository keeps as
they are:

1. **Three smells in `ADR 0001`** (the AGENTS.md adoption
   decision). ADRs are immutable per the framework's own
   discipline; editing the body of an accepted ADR would
   violate the rule the framework preaches.

Research citations are a non-example: `context-engineering.md`
(Anthropic's 80% BrowseComp finding) and `multi-agent.md` (the
15× multi-agent token-cost figure) cite their source directly
and are worded without weasel terms, so `clarify` passes them
on merit, not via an exemption.

The clarify command is designed for living documents (specs,
docs, change proposals). A future contributor running it should
expect zero hits in living text and exactly three hits in
`ADR 0001`.

## How to propose lifting a deferral

Open a `doctrina change new` whose proposal names the item from
this register, the trigger that has fired, and the scope of the
lift. The change folder ships the work; this doc gets updated to
record the new status.
