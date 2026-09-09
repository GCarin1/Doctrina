# Workflow

This doc explains how work moves through a Doctrina project. Read
[getting-started.md](getting-started.md) first if you have not.

## The cycle

Every non-trivial change passes through four phases coordinated by a
single linear orchestrator (you, or an AI agent acting on your behalf):

```
intent -> spec  ->  plan  ->  implement  ->  review  ->  curate
```

1. **Intent → spec.** You describe what you want. The agent refines
   the request into either a new capability spec or a change proposal
   with a spec delta. Ambiguity is killed here.
2. **Spec → plan.** The change folder gains a `tasks.md` and, if
   non-trivial, a `design.md`. Architectural decisions surface as ADRs.
3. **Plan → implement.** Code is written against the approved spec, and
   the spec's `Implementation:` axis advances as it lands.
4. **Implement → review.** The build gate (`doctrina verify`) and the
   traceability report (`doctrina coverage`) run alongside
   `doctrina validate`; spec deltas are merged into the affected specs.
5. **Review → curate.** The change is archived (which refuses to close
   while verification is unchecked). The index is updated. Next cycle.

There are no parallel writing agents at any phase. Subagents may
explore the codebase for context, but only one writer touches a given
artifact at a time. See [multi-agent.md](multi-agent.md) for the
operating model and ADR 0004 for the reasoning.

## The guided fast path

Driving the cycle by hand means many commands per feature. Two commands
collapse the ceremony by handing the interpretation work to the AI agent
that runs them, while keeping the CLI itself offline and deterministic
(see ADR 0005):

- **`doctrina intake <file>`** (or `doctrina init --intake <file>`)
  stores your full project description verbatim at
  `.doctrina/intake.md` and prints a **bootstrap playbook**: the ordered
  steps the agent follows to fill `product.md`, derive the capability
  list, and author one EARS spec per capability — then flip the intake
  to `Status: converted`. You hand over the whole description once
  instead of scaffolding each spec by hand.
- **`doctrina work "<prompt>"`** turns a one-line prompt ("add login")
  into a scaffolded change plus a **work playbook**: it derives the
  change id, records your prompt as the proposal's `## Why`, names the
  likely capability — scaffolding that delta with its `**Operation:**`
  filled in, marked as a guess, when the winner clearly leads — and lists
  the steps from spec delta through `apply` → `verify` (`doctrina verify`
  + `doctrina coverage`) → `archive` → `validate`.

The CLI does the deterministic half (scaffold, slug, index, term-match)
and the agent does the semantic half (write product, specs, deltas,
code). A playbook is consumed by one agent in one linear pass — the
single-orchestrator discipline of ADR 0004 is unchanged. If a
description or prompt is genuinely ambiguous, the agent asks before
assuming.

**The playbooks are templates, not prose in this page.** Their steps live
in `.doctrina/templates/playbooks/{work,chore,bootstrap}.md.template` and
resolve project-over-bundled like every other scaffold (ADR 0019): run
the command to read the current playbook, and drop your own file in
`.doctrina/templates/playbooks/` to adapt it to your team's process — an
extra review step, a different close. This page deliberately does not
repeat the steps, because a procedure written in two places is a
procedure that will disagree with itself; `doctrina templates check`
verifies each playbook still resolves and is well-formed.

In practice the bootstrap is one command: run
`doctrina init --intake <file>` (the playbook prints inline), then open
your agent and tell it to start. The scaffolded `AGENTS.md` instructs
any AGENTS.md-aware agent to detect the pending intake and execute the
bootstrap on its own — so from your seat it is "describe once, then go,"
not command-by-command document authoring.

## Lifecycle of a change

```
.doctrina/changes/<id>/                          (Status: proposed)
  proposal.md
  tasks.md
  design.md
  specs/<capability>/delta.md

# doctrina change apply <id>
#   ADDED   -> writes .doctrina/specs/<capability>/spec.md
#   REMOVED -> deletes that file
#   MODIFIED -> manual merge; CLI prints the pointer
#   proposal.md Status: flips proposed -> applied

# doctrina verify     (project build gate) + doctrina coverage
#   check every task box and the proposal's ## Verification

# doctrina change archive <id>
#   REFUSES while any task or verification box is unchecked (--force overrides)
.doctrina/changes/archive/YYYY-MM-DD-<id>/       (Status: applied)
```

After archive, the change is **episodic memory**. Doctrina deliberately
keeps it out of the default agent read path. If you need to know how a
capability used to look, read the archive. If you need to know how it
looks now, read the spec.

The change folder doubles as a self-contained context package for
handoffs between phases (and, if you swap agents across phases, between
agents). This is the same insight BMAD-METHOD's "story file" implements:
the unit of work carries everything the next phase needs to read, so
context does not leak through chat history or session state. Doctrina's
change folder is its equivalent — the workflow benefit holds without
buying into BMAD's role-based agent topology.

## Lifecycle of a decision

```
proposed  -> accepted  -> superseded by NNNN
             |             |
             |             +-- new ADR carries Supersedes: <old>
             |
             +-- accepted ADRs are immutable except for the
                 Status: and Superseded by: headers
```

Editing the body of an accepted ADR is the canonical
operational failure of SDD frameworks. Doctrina prevents it by
convention and by ADR 0001. The only command that touches an existing
ADR is `doctrina decision supersede`, and it touches only the two
header lines mentioned above.

## How specs and changes interact

A spec is the current truth: "this is how billing works today." A
change is a proposed delta: "this is what I want billing to do
differently." A delta lives only as long as it takes to apply. After
apply, the delta becomes part of the spec; after archive, the change
folder is history.

The diff between two versions of a capability spec is the cumulative
result of every applied delta. The change archive is the log of how
the spec got there.

## Specialised change shapes

### Bug-spec pattern

For non-trivial bugs, the Kiro project recommends a three-section
shape that prevents the agent from over-fixing or fixing the wrong
thing. Put this in the change's `proposal.md` (or in the delta if
the bug surfaces a missing requirement):

- **Current behaviour:** what the system does today, exactly.
- **Expected behaviour:** what it should do instead, exactly.
- **Unchanged behaviour:** what must keep working. This is the
  guardrail that stops "fix the bug, break two adjacent features."

A delta is appropriate when the bug reveals that the spec was wrong
or silent. A code-only commit (no change folder) is enough when the
spec is right and the code drifted.

### Refactor pattern

A refactor changes structure without changing observable behaviour.
The change folder for a refactor leans on `design.md` more than on
the delta:

- The delta is often **REMOVED then ADDED** for the affected
  capability (the spec body changes shape even though external
  behaviour does not), or no delta at all (pure code reshape).
- The `design.md` is the load-bearing artifact: it explains the
  trade-off, the new structure, and what consequences the team
  accepts.
- Refactors of any size **usually** earn an ADR. The decision to
  reshape is itself architecturally significant; if it is not, the
  refactor is probably small enough to skip the change ceremony.

### Skills as a complement, not a stage

Skills are not a workflow stage. They are on-demand procedural
memory loaded when a specific task matches. A change folder
captures a transient delta; a skill captures a durable
procedure. Agents pick the relevant skill up at any stage in
which the trigger fires. See [skills.md](skills.md) for the
design.

## The lane a change was born in

`doctrina work` classifies every prompt into a lane — PRODUCT (a change of
behaviour), RUNTIME (an incident in the running system), or CHORE (infra,
docs, build) — and holds a confidently runtime-shaped prompt before
scaffolding anything (ADR 0024). That verdict is now **recorded** in the
proposal header:

```
- **Lane:** product (confident; signals: add, export)
```

It is history, not a gate: nothing reads it to decide anything, and a
nonsense value changes no command's behaviour. Two things follow from
recording it:

- `doctrina report` can say what kind of work a period actually held, which
  is a question no report could answer while the verdict was computed,
  printed and thrown away.
- The classifier gains a set of right and wrong answers. **Disagreements are
  recorded too** — `— opened anyway (--force)` when the operator overrode a
  hold, `— opened as chore` when they chose a different lane. Recording only
  the agreements would build a calibration set made entirely of the cases
  that need no calibrating.

A change opened before the field existed, or opened by hand with `change
new`, simply has no lane. Reports count those as **unknown** rather than
folding them into a lane they might not belong to.

## Reading the tree: one collector, four views

Four read-only commands answer "where do things stand?" in different
shapes:

| Command | Shape | Reach for it |
|---------|-------|--------------|
| `doctrina status` | one-glance dashboard | a quick health check |
| `doctrina prime` | ~40-line session primer | the START of every session |
| `doctrina handoff` | Markdown resume note | before compaction or a handover |
| `doctrina report --since <days>` | period digest | a standup or a PR description |

They are **one collection of the tree, rendered four ways** — the same
snapshot, four pure formatters — so they cannot report different numbers
for the same repository. Each is also reachable as `doctrina status
--view <name>`, which renders byte-identical output.

## When you skip the cycle

The full cycle is overhead. Skip it when the cost exceeds the
ambiguity savings. See [gating.md](gating.md) for concrete triggers.
The short version: if you would not be annoyed by an AI agent
interpreting the requirement differently than you meant, you do not
need a spec for it.

## Memory

Doctrina v0 and v1 ship two memory types: specs (semantic, current
truth) and the change archive (episodic, history). There is no
`memory/` folder. The third bucket (consolidated lessons learned)
was deferred for the reasons documented in ADR 0003. If you have a
durable lesson that does not fit in a spec or an ADR, write it in
a doc under `docs/en/`. If you find yourself wanting it often
enough, propose adding `memory/` in a future change.
