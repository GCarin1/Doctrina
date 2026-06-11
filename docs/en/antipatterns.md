# Antipatterns

Failure modes Doctrina has seen, named, and decided against. Most
are documented in ADRs; this doc is the readable, cross-linked
summary.

## 1. Documentation theater

The team produces proposals, deltas, and ADRs on a cadence that
matches Jira ceremony rather than real decisions. Within a quarter,
nobody reads them. Within a year, half of them describe code that no
longer exists.

**Recognise it by:** PR comments asking "do we still need this
spec?" or commits that update the spec without anyone reading it.

**Avoid by:** following [gating.md](gating.md). If the trigger
question does not fire, skip the proposal. Keep `doctrina validate`
in pre-commit so drift is detected, not accumulated.

## 2. Automatic memory curation

Letting an agent write into a `memory/` folder without a human gate.
The folder swells. Outdated lessons compete with current truth. The
LLM reads more low-density context on every turn, costs go up,
quality goes down.

**Recognise it by:** a `memory/` (or similar) folder whose entries
are not citable from PR reviews.

**Avoid by:** ADR 0003 — no `memory/` in v0 or v1. Promote durable
lessons into specs or ADRs. If a lesson does not deserve either, it
does not deserve to be persisted.

## 3. Multi-agent parallel writers

Two agents (a Dev and a QA, an Architect and a Coder, etc.) writing
to the same artifact at the same time, each with partial context.
They take conflicting implicit decisions. The result merges
incoherently.

**Recognise it by:** spec files with two competing structures, or
deltas that contradict each other on the same change.

**Avoid by:** ADR 0004 — single linear orchestrator. Parallel
subagents are fine for read-only investigation; never for writes
to shared artifacts. See [multi-agent.md](multi-agent.md) for the
constructive model that replaces this pattern.

## 4. Editing an accepted ADR

Someone "tweaks" an old ADR to reflect what the system now does.
The decision history is silently overwritten. Future readers cannot
tell which version of the decision was actually made when, by whom.

**Recognise it by:** diffs to the body of an ADR with
`Status: accepted` (anything outside the `Status:` and
`Superseded by:` headers).

**Avoid by:** `doctrina decision supersede`. The old ADR keeps its
body; the new ADR records what changed. The Status header is the
only mutable part.

## 5. Bloating AGENTS.md

`AGENTS.md` accretes prose, tutorial content, project history. It
crosses 300, 500, 800 lines. The lost-in-the-middle penalty kicks in
and agents start ignoring critical rules buried in the middle.

**Recognise it by:** line count > 200 (`doctrina validate`
warns at > 150, errors at > 200).

**Avoid by:** keep AGENTS.md to commands, conventions, fronteers, and
the read order. Move everything else to `docs/`, specs, or ADRs.

## 6. Treating the archive as live truth

Agents or humans read `changes/archive/` to understand "how things
work today." Stale assumptions creep into new work.

**Recognise it by:** commits or PR comments that cite an archived
change as authoritative.

**Avoid by:** the rule baked into AGENTS.md — the archive is out of
the default read path. If you need to know how a capability
**used to** look, the archive is where you look. If you need to
know how it **currently** looks, you read the spec.

## 7. Spec without acceptance criteria

A spec lists requirements but does not state how to know they are
satisfied. The agent writes code that "looks right" and there is no
ground truth to push back against.

**Avoid by:** every spec template ends with an `Acceptance criteria`
section. Fill it with observable, verifiable signals — counts, exit
codes, behaviour, not adjectives.

## 8. Skipping the trigger question

The team opens a change for every commit because "we are an SDD
shop now." Ceremony explodes, throughput crashes, the practice gets
blamed and abandoned.

**Avoid by:** [gating.md](gating.md). The trigger question is one
sentence. Apply it. Skip when it does not fire.

## 9. Translating specs into other languages

A well-meaning contributor translates `.doctrina/specs/billing/spec.md`
into PT. The two files drift. Now you have a spec ambiguity problem.

**Avoid by:** the docs spec — only `docs/` is translated, never
specs or ADRs. Specs and ADRs stay EN, period.

## 10. Iterative refinement without a security review

Letting an agent refine the same generated code across five or
more "polish" iterations without running a security scan between rounds.
The arXiv:2506.11022 study measured a **+37.6% increase in critical
vulnerabilities after only five iterations** of LLM-driven
refinement. Each polish pass plausibly improves readability while
silently introducing or deepening security defects (missing input
validation, broadened scopes, leaked secrets, weakened auth).

**Recognise it by:** code where the seventh "small tweak" commit
adds a vulnerability the first commit did not have, and the diff
is too noisy to spot it by eye.

**Avoid by:** make the Review/Verify phase (see
[multi-agent.md](multi-agent.md)) run a security scan as one of its
read-only subagent tasks on every iteration, not just at the end.
For high-blast-radius areas (auth, billing, migrations), require an
explicit security pass before the change archives.

## 11. Reaching for a vector store too early

The project has 200-500 files. Someone proposes adding RAG or
a vector store to "help the agent find things." The runtime gets
heavier, retrieval becomes a black box, and the team spends weeks on
relevance tuning instead of features.

**Avoid by:** files in git are the source of truth for v0 and v1.
Reach for retrieval only when the spec corpus exceeds what fits in
the agent's useful context (typically hundreds of thousand of
tokens of active truth) **and** when measurement says lookup is the
bottleneck. Until then, the cost of "lost in the middle" beats the
cost of recall opacity.
