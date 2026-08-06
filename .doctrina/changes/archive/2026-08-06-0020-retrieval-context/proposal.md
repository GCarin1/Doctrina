# Change 0020-retrieval-context — Context assembly is retrieval, not a dump

- **Status:** applied
- **Applied:** 2026-08-06
- **Date:** 2026-08-06
- **Owner:** audit remediation v2
- **Affects specs:** gates, cli

## Why

Audit item M4. Doctrina's thesis is that token spend predicts agent
performance, and `doctrina context` is where that becomes tooling. It
concatenated a fixed list instead.

`doctrina context cli` on this repo was 23 files and ~37,900 tokens. Twenty
accepted ADRs were ~26,200 of them — **69% of the pack**, none of it selected
for the task. The cause is structural: ADRs are immutable and never retire,
so every accepted decision joins every pack forever and the pack grows with
the project's AGE rather than with the task. At 21 ADRs it spent two thirds
of the budget on history nobody asked for, and would spend more every month.

## What

Three mechanisms, in the order they apply (ADR 0022):

- **Scope.** `- **Scope:** <cap>[, ...]` on an ADR, surfaced as
  `decisions[].scope`. Unscoped means GLOBAL, so a project that never adds
  the header sees the pack it saw before — adoption is opt-in, not a
  migration. `doctrina decision scope` proposes scopes from the archived
  change that cites each ADR, because nobody hand-annotates 21 immutable
  documents.
- **Budget.** `--budget` > `config.context_budget` > 15,000. The pack is
  assembled to FIT it, not merely measured against it.
- **Degradation.** Over budget, an ADR falls back to its decision in one
  sentence and a spec to its purpose, least relevant first, before anything
  is dropped. Every degradation is named in the report.

`--for "<task>"` ranks by relevance so what survives the budget is what the
task is about.

**Result:** `context cli` ~37,900 → ~14,500 tokens. Every capability pack
fits the default. Scoping shrank `core` to 73% and `docs` to 67% with no
degradation at all — decisions excluded because they do not govern that
capability, not because a ceiling bit.

**Two bugs the tests caught, both mine:**

1. The first ladder dropped all twenty ADRs to keep seven specs whole, then
   had to summarise the specs anyway — the worst of both. Every degradation
   must precede any drop: a decision in one sentence still carries the
   decision, an omitted one carries nothing.
2. Ranking on raw hit counts rewards a document for being long. The 473-line
   `cli` spec out-ranked `skills` on "write a skill from git history" purely
   on volume. Coverage first, then density per 1000 characters.

**And one the full suite caught:** `deriveIndex` and `decision new` each
built a decision record by hand, so M4's new `summary` field existed in one
and not the other — every freshly created ADR became index drift. Five
failures, one root cause. There is one deriver now.

## Scope boundaries

- The token estimate stays `chars/4`. Rough, but the same rough for every
  artifact, which is what a budget needs.
- No embeddings for `--for`: zero-runtime-dependency stands, and a ranking a
  user cannot predict is one they cannot trust.
- Four ADRs are left deliberately global (0001, 0003, 0004, and the withdrawn
  0002). They are about the framework's stance, not a capability.
- `context` can now exit 1 where it always exited 0 — intended, and called
  out in the ADR's Negative consequences.

## Verification

<!--
How you will know the change is correctly applied. Use checkboxes: every
box here is a claim that must be PROVEN before the change is done.
`doctrina change archive` refuses to archive while any box below is
unchecked (pass --force to archive anyway and record the gap). Distinguish
"task marked done" from "verification passed" — link the evidence.
-->

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

None.
