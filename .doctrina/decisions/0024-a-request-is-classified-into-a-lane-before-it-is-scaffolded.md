# ADR 0024 — A request is classified into a lane before it is scaffolded

- **Status:** accepted
- **Date:** 2026-09-03
- **Deciders:** Gcarini
- **Scope:** cli, gates
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** `packages/doctrina-cli/src/commands/triage.js`, `packages/doctrina-cli/src/commands/work.js`, `packages/doctrina-cli/test/runtime-commands.test.js`
- **Landed:** —

## Context

`doctrina work` was the answer to every request. AGENTS.md says so —
"turn any request into a change with `doctrina work`" — and the playbook
that follows is spec delta → tasks → implement → close.

That is the right ceremony for a change of behaviour, where writing the
delta *is* the work. It is the wrong one for an incident. The 0.14.0
field review documented the cost: a broken workflow, an invalid env
value, and a suite that ran nothing each became a change with a
proposal, tasks and a spec delta — roughly half an hour of artifact for
a bug the YAML already explained, ending in a `close` that attested to a
diagnosis rather than to a change. Worse, the requirement usually
already existed: the spec was right and the implementation did not
honour it, so there was no honest delta to write and the agent wrote one
anyway.

The same review found `next` compounding it. After a job went green
having executed nothing, the recommended action was to open a change on
the observability capability — sending the agent to polish the Markdown
of an empty-state message while the cause sat in a file no action named.

## Decision

A request is classified into one of three lanes **before** anything is
scaffolded:

| Lane | Meaning | Route |
|------|---------|-------|
| PRODUCT | behaviour changes; the spec delta is the point | `doctrina work` |
| RUNTIME | wired wrong, empty, or ran nothing; no delta to write | diagnose first |
| CHORE | implementation-only, already specified | `doctrina work --chore` |

`doctrina triage` owns the classifier and, with or without a prompt,
runs the runtime checks. `work` consults it and HOLDS a confidently
runtime-shaped prompt; `next` ranks a broken runtime declaration above
every artifact chore; `doctor` carries it as one more row.

Three constraints keep this from becoming a gate on judgement:

1. **It is deterministic term matching, and a hint** — the same contract
   `work` already makes about its capability guess (ADR 0005). No
   language understanding, and it prints the signals it matched so a
   wrong call is arguable rather than mysterious.
2. **PRODUCT is the default and must be BEATEN**, so an ordinary feature
   request that happens to mention a "job" is never diverted into a
   diagnosis. Confidence is the margin over the runner-up.
3. **The hold is exit 3 (PRECONDITION), not 1 (GATE)**, and `--force`
   proceeds. The work may be perfectly valid; it simply has not been
   diagnosed. A gate code would read as "your prompt is bad" and invite
   rewording it forever (the C7 failure mode, ADR 0018).

## Alternatives considered

1. **Leave `work` as the universal entry and document the lanes.** This
   is the status quo the review criticised: the documentation already
   implied judgement, and the default pulled the other way.
2. **Refuse a runtime-shaped prompt outright.** Rejected: a deterministic
   term match is not entitled to the last word, and a framework that
   cannot be overridden gets worked around.
3. **Fold triage into `doctor`.** Rejected: `doctor` is an aggregate over
   the artifact tree with no notion of a request. Classifying a prompt
   and diagnosing a system are one command only because the answer to
   "this is a runtime problem" must immediately be "and here is what is
   wrong".
4. **An LLM classifier.** Rejected outright by ADR 0005: the CLI performs
   no natural-language interpretation.

## Consequences

**Positive**

- Ceremony becomes proportional to the request. An incident gets a
  diagnosis; a behaviour change still gets its delta.
- `next` stops recommending Markdown polish over the cause of a lying
  run.
- The index stops accreting changes that only restate a requirement that
  was already written.

**Negative**

- A wrong classification costs one `--force`. Mitigated by requiring a
  margin over the runner-up before the hold fires at all, and by
  printing the matched signals.
- The signal lists are English term matches; a non-English prompt falls
  through to PRODUCT, which is the safe default rather than a wrong hold.

**Neutral**

- One more command on the surface. It is the one AGENTS.md now names
  first in the Change group, because it is the first thing to run.
