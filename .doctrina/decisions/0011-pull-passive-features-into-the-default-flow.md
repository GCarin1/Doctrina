# ADR 0011 — Pull passive features into the default flow

- **Status:** accepted
- **Date:** 2026-06-27
- **Deciders:**
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** —
- **Landed:** 2026-06-27 — `.doctrina/templates/hooks/pre-commit.sample`, `.doctrina/templates/AGENTS.md.template`, `.doctrina/templates/spec.md.template`, `packages/doctrina-cli/src/commands/validate.js`, `packages/doctrina-cli/src/commands/work.js`, `packages/doctrina-cli/src/commands/next.js`, `packages/doctrina-cli/src/commands/hooks.js`

## Context

The 2026-06-27 external review (`REVIEW-doctrina-2026-06-27.md`, tested on the
"Cidade Viva" project) reached a sharp diagnosis: Doctrina's loop-closing
capabilities are **competent but passive**. They exist, they work, and nothing
in the default flow pulls them into use, so they wither:

- **`trace` / intent-provenance (ADR 0006) ran inert** — no `Realizes:` headers,
  no `[SC1]` anchors, because the feature is opt-in and nothing forces the tag.
- **`skills` stayed empty** even where a fix (the review's change-0003 "tolerate
  LLM code fences") was the textbook lesson to capture — nothing leads the agent
  to `skill new`.
- **`doctrina context` was re-implemented by hand** — the highest-value
  agent-facing command is surfaced only inside the `work` playbook, so a task
  that does not start from `work` (review, debug, a question) never reaches it.
- **The primary gate failed on index drift** — the pre-commit hook ran a bare
  `validate`, which *errors* on metadata drift (ADR 0009) but does not *repair*
  it, so a hand-edited header left the repo red until a manual `index rebuild`.
- **`decision land` went unused**, so accepted ADRs rotted with bare evidence.

The common cause is design, not implementation: the framework has the right
levers but does not place them in the agent's hand at the right moment. The
bound is the same as ADR 0005 — the CLI stays deterministic and never interprets
natural language — and the same as the framework's "block, never imprison" rule:
every new nudge is advisory, with an escape hatch.

The review's deferred conceptual ceiling (semantic intent-drift, an
LLM-assisted `trace --semantic`) is explicitly out of scope here; it remains
deferred to a future LLM-gated layer (ADR 0006), since it contradicts the
deterministic-CLI boundary.

## Decision

Pull the passive loop-closers into the default path, all deterministic, all with
escape hatches:

1. **Pre-commit hook self-heals index drift.** The shipped `pre-commit.sample`
   runs `doctrina validate --fix` (not bare `validate`): it regenerates
   `index.json` from the tree — repairing metadata drift and migrating the
   `framework_version` stamp — re-stages the index, and still blocks the commit
   on errors a rebuild cannot heal. This eliminates the single most common gate
   failure at commit time instead of reporting it. To gate without auto-repair
   (CI-style), the installed hook is editable to a bare `validate`.

2. **Surface the agent-facing command surface in the always-loaded file.** An
   agent only knows the commands named in `AGENTS.md` (always loaded) or printed
   by the `work`/`intake`/`next` playbooks; the template named ~6 of ~33, so a
   task not entered through `work` (review, debug, an ad-hoc fix) left the agent
   blind to the rest (review §13). The `AGENTS.md` template now (a) leads "How to
   read context efficiently" with `doctrina context [<capability>] --concat` for
   any task, and (b) adds a dense "Doctrina command surface" map grouped by
   moment — read/orient, start, scaffold, advance/close, gates — so the agent
   self-serves and the human stays passive, with `doctrina --help` as the full
   list. Manual creation (`spec new`, `skill new`, …) stays first-class in the
   map; the section just makes the agent reach for the CLI instead of
   hand-authoring. Kept under the 150-line `AGENTS.md` budget.

3. **Make provenance opt-out, not opt-in.** `spec new` scaffolds a `**Realizes:**`
   header in the capability template, and `validate` warns when an *active* spec
   on the implementation axis declares none. Any value silences it, including a
   deliberate `**Realizes:** n/a — <why>` for an internal capability. The `work`
   playbook gains an explicit step to tag a `product.md` anchor and set
   `Realizes:`, and lists `doctrina trace` among the closing gates.

4. **Nudge capture of procedural memory and decision evidence.** The `work` and
   chore playbooks end with a `doctrina skill new` nudge when a change taught a
   reusable lesson. `doctrina next` adds two priority-ordered actions: suggest
   `doctrina decision land NNNN` for an accepted ADR with neither Evidence nor
   Landed, and a single skill-capture nudge when no skill exists yet and an
   archived change is fix-shaped. Both fire only when warranted, so a project
   that opted in is never nagged.

## Alternatives considered

1. **Treat `index.json` as a gitignored build artifact (regenerate, never
   commit).** Rejected for now: the committed index is a useful review surface
   and a cache for read tooling. Auto-`--fix` in the hook removes the drift
   footgun without removing the artifact — the smaller, reversible change.
2. **Make `Realizes:` a hard error (block specs without it).** Rejected: it
   violates "block, never imprison" and would punish legitimately internal
   capabilities. A warning with an `n/a — <why>` escape hatch records the
   deliberate gap, matching the existing `Implementation:` honesty pattern.
3. **Auto-generate skills from fix-shaped changes.** Rejected: a skill's value is
   the human/agent-authored lesson; the CLI synthesising one would be the same
   "guess semantics" overreach ADR 0005 forbids. The nudge points; the agent
   writes.
4. **Run `decision land` automatically on `change archive`.** Rejected: landing
   asserts "implemented and verified," a claim the CLI cannot make
   deterministically. `next` surfacing the suggestion keeps the assertion human.

## Consequences

**Positive**

- The features that close the intent→capability→evidence loop are now reached by
  the default flow, not only by an agent who already knows to ask for them.
- The primary gate stops going red on the most common, mechanically-repairable
  cause; drift is healed at commit time and the version stamp migrates for free.
- Dogfooded: this repo's specs now carry `Realizes:` (or an honest `n/a`), and
  `doctrina trace` reports 4/4 product anchors realized, 0 untraceable.

**Negative**

- More advisory warnings (the `Realizes:` nudge) and more playbook text — minor
  noise, all silenceable, none blocking.
- The cli spec grows further past its 400-line soft cap (3.7 right-sizing
  residue): documenting these behaviours reinforces that the kitchen-sink cli
  spec should be split — tracked, not addressed here.

**Neutral**

- No new commands or flags: the changes ride existing surfaces (`validate --fix`,
  `next`, `work`, `spec new`, the templates).
- The semantic intent-drift check and ceremony/right-sizing profiles remain
  deferred; this ADR closes the *adoption* gap, not the *fidelity* ceiling.

<!--
Once this ADR is accepted, do not edit it. To change the decision,
create a new ADR that supersedes this one and update the "Superseded by"
header above to point at the new ADR. Status transitions:
proposed -> accepted | rejected
accepted -> deprecated | superseded by NNNN
-->
