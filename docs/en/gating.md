# Gating

The Doctrina pipeline is overhead. This doc tells you when it pays
off and when it does not.

## The trigger question

> "Would I be annoyed if the agent interpreted the requirements
> differently than I meant?"

If the answer is yes, you want a spec. If no, you do not. That single
question replaces a checklist most of the time.

## Concrete triggers

The full cycle (open change → write delta → apply → archive) is worth
it when **any** of the following hold:

- The work touches a capability covered by an existing spec.
- The work changes observable behaviour for users or for other
  systems.
- The work has more than one plausible implementation and you want
  the agent to pick one and stick to it.
- The work crosses a subsystem boundary or affects an interface.
- The work introduces or changes a dependency.
- The work has security or compliance implications.

The full cycle is **not** worth it for the following five scenarios
that the SDD literature (marmelab, Augment, arXiv:2602.00180)
converges on as negative-ROI for spec ceremony:

1. **Throwaway prototypes.** Code you will discard within a week.
2. **Short-lived solo projects.** No second reader, no future you to
   thank.
3. **Exploratory code.** Spikes whose goal is to learn, not to ship.
4. **One-line fixes.** Typos, formatting, single-line bugfixes,
   mechanical renames of private fields.
5. **Obvious CRUD.** Boilerplate whose shape is dictated entirely by
   a schema with no judgement calls.

In any of those cases: write the code, run the tests, commit. No
proposal, no delta, no archive.

The rule of thumb the research distils: **use the minimum spec rigour
that removes ambiguity in your context**. More structure for its own
sake produces the bureaucracy this doc warns against.

## When to write an ADR

Open an ADR (independent of any change) when the decision is:

- Hard to reverse (database engine, deployment topology, public API
  shape).
- Architecturally significant (concurrency model, data ownership,
  authentication strategy).
- A choice the next reader would otherwise re-litigate from scratch.

Do **not** write an ADR for:

- Implementation details that show up in code (variable naming,
  internal data structures).
- Decisions that already live in a spec.
- Decisions you would not bother explaining to a new teammate.

Rule of thumb: if you would write an internal blog post about it, it
is an ADR.

## When to update `product.md`

Update `product.md` when the project's scope, target users, or
non-goals change. Bug fixes and small features do not move
`product.md`; pivots do.

## When to refactor the docs

Refactor the docs when an existing doc has been read by you or an
agent and produced wrong action. If nobody hits it, nobody fixes it.
Doctrina's `validate` does not check doc freshness — humans do, by
PR review and by the trigger above.

## Anti-pattern: gating everything

The point of Doctrina is to reduce surprises, not to manufacture
ceremony. Teams that run the full pipeline for every commit produce
the documentation theater that ADR 0003 warned about. If
`doctrina validate` is the only thing keeping artifacts in sync with
reality, the artifacts are not pulling their weight.

The pragmatic discipline:

1. Default to skipping.
2. Open a change only when the trigger question fires.
3. Keep specs short, dense, current.
4. Archive proposals fast.
