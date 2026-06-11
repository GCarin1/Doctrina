# Migrating to Doctrina

Practical mappings from the five most-cited SDD frameworks of
2025–2026 to their Doctrina equivalents. Each section assumes you
already use the source framework and want to bring your work over
without losing context.

## General principles

What carries over from any of the five sources:

- **Specs as truth.** Every source framework treats specifications
  as durable artifacts. Doctrina keeps that contract; only the
  on-disk path and naming change.
- **Architectural decisions as records.** Doctrina uses
  Nygard/MADR ADRs; whatever shape your source records use,
  the content maps one-to-one.
- **EARS requirements** carry over verbatim where you used them.
  Doctrina's spec template ships EARS section headings.

What does **not** carry over:

- Role-based agent topologies (BMAD). Doctrina rejects parallel
  writers per ADR 0004; role labels become phase personas the
  single orchestrator adopts in sequence.
- LLM-generated context files. The ETH Zurich AGENTbench result
  is the reason; any framework that ships such files should not
  blindly port them.
- Telemetry endpoints, network calls, or remote sync. Doctrina is
  zero-deps and offline; cross-project sharing is the manual
  conventions-repo pattern (see `context-engineering.md`).

## From Spec Kit

| Spec Kit artifact | Doctrina equivalent |
|-------------------|--------------------|
| `.specify/memory/constitution.md` | The accepted ADRs (`0001`, `0003`, `0004` in this repo) plus the design-principles section of the README |
| `/speckit.specify` slash command | `doctrina spec new <capability>` |
| `/speckit.plan` slash command | `proposal.md` + `design.md` inside a change folder |
| `/speckit.tasks` slash command | `tasks.md` inside a change folder |
| `/speckit.implement` slash command | The implementation step in the workflow (no dedicated command) |
| `/clarify` quality gate | `doctrina clarify <path>` |
| `/checklist` quality gate | The `## Acceptance criteria` section in every Doctrina spec |
| `/analyze` quality gate | `doctrina analyze <change-id>` |

Migration sketch:

1. `doctrina init` in your project.
2. Read your `constitution.md`. Each non-negotiable rule becomes
   either an ADR (architectural choices) or a line in the new
   `AGENTS.md` (operational rules).
3. For each existing `spec.md` under your Spec Kit tree, run
   `doctrina spec new <slug>` and paste the relevant content into
   the new spec body.
4. For in-flight work, open a `doctrina change new` per active
   `plan.md`, copy the plan into `design.md`, the tasks into
   `tasks.md`, and proceed.

## From OpenSpec

OpenSpec is architecturally closest to Doctrina. The change feels
more like a rename than a migration.

| OpenSpec path | Doctrina path |
|---------------|---------------|
| `openspec/specs/<capability>/spec.md` | `.doctrina/specs/<capability>/spec.md` |
| `openspec/changes/<id>/proposal.md` | `.doctrina/changes/<id>/proposal.md` |
| `openspec/changes/<id>/tasks.md` | `.doctrina/changes/<id>/tasks.md` |
| `openspec/changes/<id>/design.md` | `.doctrina/changes/<id>/design.md` |
| `openspec/changes/<id>/specs/<cap>/delta.md` | `.doctrina/changes/<id>/specs/<cap>/delta.md` |
| `openspec/changes/archive/` | `.doctrina/changes/archive/` |
| `openspec validate` | `doctrina validate` |
| Custom `spec-driven-with-adr` schema | First-class `.doctrina/decisions/` |

Migration sketch:

1. `doctrina init` in your project.
2. Move `openspec/` to `.doctrina/` (`git mv` works; the delta
   ADDED/MODIFIED/REMOVED semantics are identical).
3. If you used the `spec-driven-with-adr` schema, your ADR files
   move directly into `.doctrina/decisions/` and gain the standard
   Doctrina header set.
4. Run `doctrina validate`. Any drift surfaces as warnings.

## From BMAD-METHOD

| BMAD artifact | Doctrina equivalent |
|---------------|--------------------|
| Agent persona files (Analyst, PM, Architect, Dev, QA, etc.) | Phase personas the single orchestrator adopts in sequence (see `multi-agent.md`) |
| Story file (per task, self-contained context) | The change folder (`proposal.md` + `tasks.md` + `design.md` + delta) |
| PRD / architecture plan from the Planning phase | `.doctrina/product.md` plus accepted ADRs |
| `bmad-core` config | Combination of `AGENTS.md` (operational) and `.doctrina/product.md` (vision/scope) |

Migration sketch:

1. `doctrina init` in your project.
2. The story-file insight (self-contained handoff package)
   transfers directly to the change folder. Your existing story
   files become the proposal/tasks/design inside a change.
3. The role-based agent prompts compress into personas the same
   orchestrator switches between. See `multi-agent.md` for the
   five canonical personas.
4. Move your PRD content into `.doctrina/product.md` and your
   architecture decisions into ADRs via
   `doctrina decision new "<title>"`.

## From AWS Kiro

| Kiro artifact | Doctrina equivalent |
|---------------|--------------------|
| `.kiro/specs/<feature>/requirements.md` (user stories + EARS) | `.doctrina/specs/<cap>/spec.md` (EARS Requirements section) |
| `.kiro/specs/<feature>/design.md` | Inside the change folder: `design.md` |
| `.kiro/specs/<feature>/tasks.md` | Inside the change folder: `tasks.md` |
| `.kiro/steering/product.md`, `structure.md`, `tech.md` | Root `AGENTS.md` (operational) plus `.doctrina/product.md` (vision) |
| Agent Hooks (on-save) | `doctrina hooks install` (pre-commit) plus `templates/hooks/watch.sample` (on-save) |
| Kiro IDE integration | Whichever AGENTS.md-aware agent your team uses |

Migration sketch:

1. `doctrina init` in your project.
2. Steering files merge into the new root `AGENTS.md`. Keep it
   under the 150-line soft cap; trim anything not operational.
3. Each feature folder becomes a capability spec (the
   requirements.md content) plus an archived change folder (the
   design.md + tasks.md from the same Kiro feature).
4. Install the pre-commit hook; pair with the watch sample for
   on-save validation.

## From SpecWeave

SpecWeave's primary differentiator is the breadth of per-agent
skills. Doctrina's thin-pointer adapter set (twelve supported
agents, each adapter under 30 lines) is a deliberate trade-off;
if your team relies on SpecWeave-specific skills for other
agents, the migration is mostly an AGENTS.md adoption decision.

| SpecWeave artifact | Doctrina equivalent |
|--------------------|--------------------|
| Per-agent skill packs | Adapter files under `.doctrina/templates/adapters/<agent>/`; twelve agents are supported out of the box, more can be added by contribution |
| SpecWeave spec files | `.doctrina/specs/<cap>/spec.md` |
| SpecWeave validate command | `doctrina validate` |

Migration sketch:

1. `doctrina init --agent all` to install every supported
   adapter.
2. Move each spec into `.doctrina/specs/<cap>/spec.md`.
3. If your team uses an agent Doctrina does not yet ship an
   adapter for, contribute it via a change (see CONTRIBUTING.md
   and the existing adapters as references — adapters are under
   30 lines each).

## After the migration

Once your specs and ADRs are in `.doctrina/`:

- Run `doctrina validate` to confirm the tree is well-formed.
- Run `doctrina clarify` over each migrated spec; the language
  conventions from your source framework may flag smells.
- Read `gating.md` and apply the gating question to in-flight
  work before opening new changes — old habits from richer-
  ceremony frameworks (Spec Kit, BMAD) tend to over-spec at
  first.

## Related material

- [Comparison](comparison.md) — positioning vs each source
  framework on fifteen dimensions.
- [Workflow](workflow.md) — the Doctrina cycle your migrated
  artifacts will move through.
- [Brownfield](brownfield.md) — apply the brownfield rules even
  to migrated specs; the just-in-time rule still helps.
