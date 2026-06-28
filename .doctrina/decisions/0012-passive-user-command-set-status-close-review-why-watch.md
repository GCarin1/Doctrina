# ADR 0012 — Passive-user command set — status, close, review, why, watch, skill suggest, qualitative gate

- **Status:** accepted
- **Date:** 2026-06-27
- **Deciders:**
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** —
- **Landed:** 2026-06-27 — `packages/doctrina-cli/src/commands/status.js`, `packages/doctrina-cli/src/commands/close.js`, `packages/doctrina-cli/src/commands/review.js`, `packages/doctrina-cli/src/commands/why.js`, `packages/doctrina-cli/src/commands/watch.js`, `packages/doctrina-cli/src/commands/skill.js`, `packages/doctrina-cli/src/commands/verify.js`

## Context

ADR 0011 made the existing command surface *visible* to the agent (the
AGENTS.md map) and healed drift passively. The follow-up question was which
*new* capabilities most reduce what is left for the human to do, given that in
a passive-user model the human's only jobs are "give intent" and "approve."
Each remaining human/agent burden pointed at a missing command:

- **Knowing where things stand** meant running validate + coverage + trace +
  next separately — no single read.
- **Closing a change** was a seven-step sequence the agent ran by hand, which
  is exactly where a gate gets skipped.
- **Approving** was unaided — nothing reviewed the change against the specs/
  ADRs/contracts, so the human (or agent) checked conformance manually.
- **Answering "why does this exist / why this way?"** meant grepping product →
  spec → ADRs by hand, even though the framework records that chain.
- **Keeping state synced and the agent oriented** required remembering to run
  things.
- **Procedural memory and a qualitative DoD** had no first-class home.

The bound is unchanged: deterministic, no natural-language interpretation
(ADR 0005), and the semantic-fidelity ceiling stays the human/LLM's job —
these commands check shape and assemble what already exists, they do not judge.

## Decision

Add seven net-new capabilities, all deterministic, none breaking the existing
surface:

1. **`doctrina status`** — a read-only one-glance health dashboard (index
   drift, framework stamp, coverage %, trace anchors, verify config, artifact
   counts). The fast summary; `validate`/`verify` stay authoritative.
2. **`doctrina close <id>`** — a driver that runs analyze → change apply →
   verify → coverage `--strict` → trace → change archive → validate in one
   pass, stopping at the first failure with the exact rerun command. Adds no
   checks of its own; verify is skipped (noted) when unconfigured, trace is
   advisory.
3. **`doctrina review [--diff <ref>] [--strict]`** — deterministic conformance
   review of the working tree (or a diff) against the spec/ADR/contract tree:
   code under a capability whose spec was not updated, changed code mapping to
   no capability, criteria citing missing proof, dropped product intent,
   contract collisions. Conformance *shape* only; fidelity stays a human/LLM
   call. The agent self-reviews before bringing work to the human.
4. **`doctrina why <capability>`** — assembles the provenance chain (the
   `Realizes:` product intent, the capability's purpose, its proven acceptance
   criteria, the accepted ADRs that name it) into one read.
5. **`doctrina watch [--once]`** — re-runs `validate --fix` and reprints
   `doctrina next` on every change under `.doctrina/`, so state stays synced
   and the agent stays oriented with no invocation. Ignores the index.json the
   fix rewrites; `--once` is the scriptable single pass.
6. **`doctrina skill suggest [--write]`** — surfaces fix-shaped archived
   changes whose skill is uncaptured and, with `--write`, scaffolds a stub
   pre-seeded from the change. The CLI points and pre-fills; the human/agent
   writes the lesson.
7. **Qualitative gate in `verify`** — a check with `"type": "manual"` is judged
   by a human/eval and recorded as a sign-off
   (`.doctrina/verify.signoffs.json`), not run. Pending by default
   (non-blocking), failing only under `--strict`; recorded with
   `verify --signoff "<name>=<note>"`.

## Alternatives considered

1. **A single `doctrina autopilot` that drives the whole loop.** Rejected
   (for now): auto-executing scaffolds/closes without per-step approval is the
   opposite of the inspectable, stop-on-failure flow `close` gives, and it
   overlaps `work` + `next`. The composable commands keep each step auditable.
2. **`close` re-implements the gates.** Rejected: it calls the existing
   commands in-process, so there is one definition of each gate; `close` only
   sequences and stops.
3. **`review` judges semantic fidelity (does the code do what the spec says?).**
   Rejected: that is the deferred LLM layer (ADR 0006). `review` reports
   structural breaks only, and says so.
4. **Auto-generate skills from fixes.** Rejected: a skill's value is the
   authored lesson (ADR 0005). `skill suggest --write` scaffolds and pre-seeds;
   it does not write the body.
5. **A blocking qualitative gate.** Rejected: a qualitative DoD is a judgement;
   blocking on an unrecorded judgement is noise. Pending-by-default with a
   `--strict` opt-in lets CI require the sign-off without blocking local runs.

## Consequences

**Positive**

- The human's two jobs shrink: `review` makes approval informed (and lets the
  agent self-review first), `close` makes "finish it" one call, `status`/`why`
  answer "where/why" in one read, `watch` keeps things synced unattended.
- All new commands are surfaced in the AGENTS.md command map (ADR 0011), so the
  agent self-serves them on any task.

**Negative**

- The command surface grows from ~33 to ~38 — in tension with right-sizing
  (3.7). Mitigated: every addition is opt-in, composable, and deterministic;
  none changes an existing default.
- The cli spec (a known kitchen-sink, ~520 lines, >400 cap) grows further —
  reinforcing that it should be split. Tracked, not addressed here.

**Neutral**

- `close` and `watch` call other commands in-process — a first for the
  codebase (commands were standalone) — but only the public `run(positional,
  flags)` entry, so coupling stays at the CLI boundary.
- The qualitative gate adds a second small state file
  (`verify.signoffs.json`), deliberately separate from `verify.json` (config)
  so a sign-off is a record, not a config edit.

<!--
Once this ADR is accepted, do not edit it. To change the decision,
create a new ADR that supersedes this one and update the "Superseded by"
header above to point at the new ADR. Status transitions:
proposed -> accepted | rejected
accepted -> deprecated | superseded by NNNN
-->
