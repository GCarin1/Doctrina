# ADR 0022 — Context assembly is retrieval, not a dump

- **Status:** accepted
- **Scope:** gates, cli
- **Date:** 2026-08-06
- **Deciders:** GCarini + agent session of 2026-08-06 (audit remediation v2)
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** `packages/doctrina-cli/src/commands/context.js`, `packages/doctrina-cli/src/lib/scan.js`
- **Landed:** 2026-08-06 — covered by `packages/doctrina-cli/test/context-retrieval.test.js`

## Context

Doctrina's thesis is that token spend predicts agent performance, and
`doctrina context` is where that thesis is meant to become tooling. It
was not. It concatenated a fixed list.

On this repository, `doctrina context cli` produced 23 files and roughly
37,900 tokens. Twenty accepted ADRs accounted for ~26,200 of them — 69%
of the pack — and not one was selected for the task at hand.

The cause is structural, not incidental. **ADRs are immutable and never
retire.** Every accepted decision joins every pack, forever. So the pack
grows with the project's *age* rather than with the *task*, and nothing
ever decays out of it. A framework that tells its users to spend context
deliberately was, at 21 ADRs, spending two thirds of theirs on history
nobody asked for — and would spend more every month.

The default pack, with no capability named, was worse: every spec in
full, which on this repo is ~26,900 tokens and climbing per capability.

## Decision

Assembly is retrieval. The pack is selected and bounded, never dumped.
Three mechanisms, in the order they apply:

**1. Scope.** An ADR may declare `- **Scope:** <capability>[, ...]`,
surfaced as `artifacts.decisions[].scope`. A scoped pack carries the
ADRs that govern that capability, plus every unscoped one. **Unscoped
means global** — so a project that never adds the header gets exactly
the pack it got before, and adoption is opt-in rather than a migration.

**2. Budget.** A token ceiling always applies: `--budget` beats
`config.context_budget` in `index.json` beats a 15,000 default. The pack
is assembled *to fit it*, not merely measured against it.

**3. Degradation, not truncation.** Over budget, artifacts fall back to
title + summary — an ADR to its decision in one sentence, a spec to its
purpose — before anything is dropped, least relevant first. A decision
reduced to a sentence still carries the decision; an omitted one carries
nothing. Every degradation and omission is named in the report.

`--for "<task>"` makes the ordering query-driven, so what survives the
budget is what the task is about.

The irreducible core — root rules, product truth, the named capability's
spec, and open changes — is never degraded and never dropped. When the
core alone exceeds the budget, the command says so and exits 1. That is
a finding about the tree (an oversized spec, a stale open change), and
hiding it behind a silently oversized pack helps nobody.

## Alternatives considered

1. **Raise the ceiling and move on.** Rejected: it postpones the problem
   by exactly as long as it takes to write more ADRs, and it concedes
   the product's own thesis.
2. **Retire old ADRs from the pack by age.** Rejected: age is not
   relevance. ADR 0001 chose the AGENTS.md substrate and still governs
   everything; ADR 0013 is newer and narrower. Recency is a tiebreak
   here, never a filter.
3. **Truncate oversized artifacts to the first N lines.** Rejected: the
   first N lines of an ADR are its Context section — the part that
   matters least. Half a decision misleads where a summary informs.
4. **Embeddings for `--for`.** Rejected on the zero-runtime-dependency
   constraint, and because term coverage over a corpus of dozens of
   documents is adequate and inspectable. A ranking a user cannot
   predict is a ranking they cannot trust.

## Consequences

**Positive**

- `doctrina context cli` went from ~37,900 tokens to ~14,500; every
  capability pack on this repo now fits the default budget.
- Scoping made packs shrink *without* degradation where it applied:
  `core` to 73% of budget, `docs` to 67% — decisions excluded because
  they do not govern that capability, not because a ceiling bit.
- The default read is now an orientation index — every capability by
  title and purpose, every decision by title and summary — instead of a
  dump that fit nothing.
- The token estimate stopped being decoration and became a constraint
  the command is accountable to.

**Negative**

- A scope that is too narrow hides a decision from a pack that needed
  it, and nothing detects that automatically. `doctrina decision scope`
  proposes scopes from the archived change that cites each ADR, but the
  confirmation is a human judgement, and a wrong one is quiet.
- `doctrina context` can now exit 1 where it always exited 0. That is
  intended — a core over budget is a real finding — but it is a
  behavioural change for anyone scripting the command.
- The pack for a given capability is no longer a pure function of that
  capability: it depends on the budget, and therefore on what else is
  open. Reproducible for a fixed tree and budget, but no longer
  reproducible across a month of work.

**Neutral**

- `chars/4` remains the token estimate. It is rough, and it is the same
  rough for every artifact, which is what a budget needs.
- Relevance is a comparable tuple — terms in the title, terms in the
  body, hits per 1000 characters — rather than one blended score, so the
  tiebreak order is readable and no weighting constant had to be
  guessed. Density rather than raw hit count is load-bearing: raw hits
  reward a document for being long, which had the 473-line `cli` spec
  out-ranking `skills` on the query "write a skill from git history".
