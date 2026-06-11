# Adopting Doctrina in a brownfield project

A brownfield project is one with a running codebase, existing
tests, real users, and decisions whose original rationales nobody
fully remembers. Doctrina aims for both greenfield and brownfield,
but the on-ramp is different. This doc is the brownfield on-ramp.

## Why brownfield is harder

In a greenfield project you write specs because the code does not
exist yet; the spec is the contract for what you are about to
build. In a brownfield project the code already exists and works.
The temptation is to "back-fill" specs for every capability before
touching anything. Don't.

Three reasons:

- **Spec inflation has a quality cost.** Every spec a human did
  not need produces token tax for every agent that reads it
  (ETH Zurich) plus drift surface that nobody maintains.
- **Reverse-engineering is slow and imperfect.** The spec you
  write from reading code captures what the code does, not what
  it should do. Those two are not the same.
- **The ROI lands quickly when you spec what you touch, slowly
  when you spec what you don't.** Spec a capability that ships a
  change soon; skip the rest until they earn the same trigger.

## Rule 1 — Spec just-in-time

When a change is about to touch capability X, spec X first. Use
`doctrina spec new <x>` to seed the file, then write only the
requirements the change cares about. The spec grows as it gets
touched; it never grows ahead of work.

This is the inverse of the typical brownfield first-week-after-
adoption pattern (sit down, list every module, write 40 specs in
three days). That pattern produces documentation theater within a
quarter. The just-in-time pattern produces specs that pull their
weight.

## Rule 2 — Retroactive ADRs for past decisions

When you discover a past architectural decision while reading
code — "we picked Postgres because we needed JSONB", "we run
billing in a worker process because of credit-card webhook
timing", "auth is a separate service to satisfy compliance" —
write an ADR with the discovery date and a "discovered, not
authored on this date" note:

```
- Status: accepted
- Date: 2026-06-10  (discovered while reading src/billing/)
- Original decision date: unknown, prior to Doctrina adoption
```

The ADR is honest about what it records (a discovered decision,
not a current judgement) and it removes the next reader's need to
re-litigate the choice.

Do **not** make up ADRs to look retrospectively organised. ADRs
fake-authored as if they were written at decision time corrupt
the project's decision history. If the rationale is genuinely
lost, write an ADR that says so:

```
- Status: accepted (rationale unrecovered)
- Date: 2026-06-10
- Original decision date: unknown
- Notes: the current implementation requires this choice; the
  original reasoning could not be reconstructed from git history
  or interviews.
```

Honest beats tidy.

## Rule 3 — Let `validate` and `clarify` do the onboarding

Once the framework is installed and two or three specs exist, run:

```
doctrina validate
doctrina clarify <each spec you wrote>
```

The output is a quiet onboarding instrument:

- Orphan warnings flag files that exist on disk but never made it
  into the index — usually old half-started specs.
- Stale-reference warnings flag links in specs and ADRs to files
  that have been moved or deleted.
- Size warnings flag oversized specs that should be split.
- Clarify warnings flag weasel words and placeholders left over
  from rushed first drafts.

None of these are errors. They are signals. Brownfield teams who
fix them as they appear stay under the lost-in-the-middle ceiling
without effort.

## Rule 4 — Apply the conventions-repo pattern to the legacy house

If the brownfield project lives inside an organisation with other
projects, the conventions-repository pattern from
[context-engineering.md](context-engineering.md) is the right
sharing primitive. One small repo owns:

- A base `AGENTS.md` with the house style (the "do not touch
  legacy without an ADR" line; the canonical commit message
  format; the security-review trigger).
- Optional snippets for common code-style do-and-don't bullets.

New projects (and brownfield adopters) paste or `@`-import this
content above the project-specific `AGENTS.md` block. The base
content is updated by hand; there is no automatic sync.

## Anti-patterns specific to brownfield

- **The day-one spec sprint.** Writing 40 specs in week one
  produces 38 unread specs in week eight. Spec what you touch.
- **Faking ADRs as if you wrote them at the time.** Always tag
  retroactive ADRs as discoveries with a current date.
- **Spec'ing stable code that nobody is changing.** If a
  capability has not changed in two years and nobody is going to
  change it soon, it does not need a Doctrina spec. The code is
  the spec.
- **Treating `clarify` warnings as errors at adoption time.**
  Existing prose was not written with the framework in mind.
  Clean up clarify smells as you touch each file; do not sprint
  through them.
- **Translating internal jargon into spec language wholesale.**
  Specs are written for the next reader, not as a glossary. If a
  term carries meaning only to the original team, define it once
  in `product.md` and use it normally elsewhere.

## When brownfield meets the change workflow

Once two or three capabilities are spec'd, brownfield projects
use the normal change cycle. Two adjustments worth knowing:

- **Bug-shaped specs are common during the first month.** Use
  `doctrina spec new <cap> --bug` for issues found while reading
  code. The current/expected/unchanged behaviour template fits
  the discovery-then-decide brownfield rhythm.
- **Refactor changes carry more ADR weight than greenfield ones.**
  A refactor in a brownfield project usually surfaces a past
  decision that is no longer optimal; that decision belongs in an
  ADR even when the refactor itself is small.

## Related material

- [Workflow](workflow.md) — the cycle the rules above plug into.
- [Gating](gating.md) — when the full pipeline pays for itself.
- [Context engineering](context-engineering.md) — the principles
  these rules apply.
- [Antipatterns](antipatterns.md) — the general failure modes
  that brownfield projects hit harder than greenfield.
