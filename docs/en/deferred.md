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

## Line-ending policy (`.gitattributes`)

**Status:** deferred — the failure it caused is fixed, the root
cause is not.

This repository declares no line-ending policy, so a Windows
checkout stores 519 of its 730 versioned files as CRLF. That is
not a problem for the CLI, which splits on `/\r?\n/` throughout;
it was a problem for the TESTS, nine of which assumed LF and so
could not run on the machine the work was being done on. Change
0117 made those nine agnostic, and the suite now runs on both.

**Why the obvious fix is not the chosen one.** `* text=auto
eol=lf` plus a renormalising commit would settle it in one line —
and rewrite 519 files, burying every subsequent `git blame` and
colliding with any work in flight. That cost is paid once by
everyone who ever reads the history, to solve a problem that no
longer bites.

**The preferred approach when this is revisited**, cheaper and
narrower than renormalising:

1. A lint over `test/` that refuses the assumption rather than the
   bytes — no bare `.split("\n")` on file content, no `\n`-anchored
   pattern against a file read from disk. That is what actually
   broke, and it prevents the next instance instead of the last.
2. `.gitattributes` scoped to the files a test compares byte for
   byte — `.doctrina/templates/**`, `test/fixtures/**`, `action.yml`
   — which is a few dozen files, not 519.
3. Whole-tree normalisation only if a third class of failure appears
   that neither of those covers.

**Trigger to revisit:** a line-ending failure that is NOT in a test
fixture — the CLI itself, or an adopting team's artifacts, behaving
differently by platform. Until then the assumption is linted and the
bytes are left alone.

## The macOS + Node 20.12 context-pack failure

**Status:** open — narrowed and instrumented, not closed. Needs a
macOS runner.

Two tests fail on macOS with Node 20.12 and on no other leg of the
matrix — not Linux, not Windows, not macOS with Node 22. They have
been red in CI since at least 2026-08-06, which is long enough that
the colour stopped being read.

Both are about context assembly, and both saw a pack that was
SMALLER than it should be: one expected `.doctrina/product.md` in
the `--concat` output and got a pack that ended after `AGENTS.md`;
the other expected some ADR to be summarised under a fixed budget
and found nothing degraded, which is what a smaller pack produces.

**What has been ruled out.** A symlinked working directory — the
obvious suspect, since macOS resolves `/var/folders/...` to
`/private/var/...` and `os.tmpdir()` sits under it — was reproduced
on Linux with an explicit symlink and did not reproduce the
failure.

**What was done instead.** Change 0130 removed the second test's
dependence on a hardcoded budget: it now measures the window
between the pack's irreducible core and its full size, so a
smaller pack on any platform no longer breaks it. Change 0133 took
the first test apart into its five links — init, the file on disk,
the scoped listing, the concat run, the rendering — each naming
what it found. The next macOS run reports which link broke
instead of one missing regex.

**Trigger to revisit:** the next CI run on macOS with Node 20.12.
The failure now names its own cause; close it from that log. If it
comes back green, change 0130 was the whole of it.

## Other items deferred or scoped out

- **`/checklist` quality-gate command.** The spec template's
  `## Acceptance criteria` section covers the use case. Trigger
  to revisit: someone proposes a checklist shape distinct from
  acceptance criteria.
- **Centralised constitution document — shipped in 0.10.0.** Rather
  than a separate `constitution.md` (a second home for facts already
  in the ADRs), `doctrina prime --rules` assembles the view on demand
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
