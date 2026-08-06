# Spec — Empirical Validation Protocol

**Capability:** validation
**Status:** active
**Implementation:** implemented
**Realizes:** SC1, SC2, SC3
**Last updated:** 2026-08-06
**Version:** 0.3.0

## Purpose

Define a measurable protocol a project can run to decide whether
Doctrina is paying for itself. The protocol compares work performed
without Doctrina (baseline) against work performed with Doctrina
(treatment) using pre-declared metrics and pre-declared decision
triggers, so the team avoids the "AI productivity paradox" of
mistaking velocity for value.

## Required metrics

The system shall measure every item below in both baseline and
treatment cohorts using the same definition in each cohort.

| Metric | Definition | Pair |
|--------|------------|------|
| Lead time for changes | Wall-clock from first commit on a feature branch to the deploy that lands it. | Quality: change failure rate. |
| Change failure rate | Proportion of deploys that cause incidents, rollbacks, or hotfixes. | Velocity: lead time, deployment frequency. |
| Mean time to restore service | Wall-clock from incident open to incident close for production incidents tied to a deploy. | Velocity: deployment frequency. |
| Deployment frequency | Number of production deploys per unit time. | Quality: change failure rate, MTTR. |
| Rework rate | Proportion of deploys that are unplanned because of a problem found in production (DORA 5th metric, 2025). | — (already a quality metric). |
| Cost per feature | Token spend (preferred) or wall-clock developer hours per completed feature. | Quality: change failure rate. |
| PR review time | Wall-clock from PR opened to PR merged. | — (the Faros 2025 watchdog metric). |

## Requirements (EARS)

### Ubiquitous

- The system shall define the seven metrics above as the required
  measurement set for any Doctrina validation run.
- The protocol shall pair every velocity metric with at least one
  quality metric.
- The protocol shall declare decision triggers in advance, before
  any data is collected.
- The protocol shall be re-runnable as Doctrina, the team, or the
  codebase evolves.
- The system shall verify itself the way a user installs it, packing the CLI, installing the tarball outside the repository, and driving a project through the whole lifecycle with the installed binary.

### Event-driven

- When a team adopts Doctrina, it shall first record baseline
  metrics on three to five work items completed without the
  framework.
- When the same team has completed three to five work items of
  comparable complexity with Doctrina active, it shall record
  treatment metrics using the same definitions and the same
  recording shape.
- When treatment data is collected, the team shall produce a
  comparison record listing every metric, baseline value, treatment
  value, and the outcome of every trigger.
- When the end-to-end harness runs, the system shall assert that the structural, template, and diagnostic gates are green at each lifecycle step, and that every bundled adapter installs into a project that passes its own checks.

### State-driven

- While the project is in baseline-collection mode, the work items
  being measured shall contain no Doctrina artifacts.
- While the project is in treatment-collection mode, the work items
  being measured shall be performed against an initialised
  `.doctrina/` tree with the relevant adapters installed.

### Unwanted-behavior (must-not)

- The protocol shall not declare Doctrina a success based solely on
  velocity metrics.
- The protocol shall not compare a treatment cohort to a baseline
  collected in a materially different period (team composition
  change, stack change, market change, scope change of similar
  magnitude).
- The protocol shall not require statistical significance testing.
  Sample sizes are too small and the goal is honest before/after
  measurement against pre-declared thresholds, not research-grade
  inference.

### Optional

- Where token-level instrumentation is available, the team may
  collect cost-per-feature in tokens; otherwise the team shall use
  wall-clock developer hours.
- Where a documentation site or dashboard exists, the team may
  publish the comparison record there. In its absence, a Markdown
  table committed under `docs/` is sufficient.

## Decision triggers

The protocol shall evaluate, after every run, the four triggers
below independently. More than one may fire.

1. **Keep or expand** Doctrina if rework rate drops in treatment AND
   change failure rate does not rise.
2. **Simplify** Doctrina if PR review time grows by more than 50% in
   treatment (Faros 2025 paradox threshold).
3. **Cut any individual context artifact** (a specific doc, a
   specific spec) whose A/B comparison shows no improvement in task
   success OR a cost increase of more than 20% without a quality
   gain (ETH Zurich AGENTbench threshold).
4. **Eliminate any artifact category** whose files were not read by
   humans or agents during the treatment period.

## Compliance rubric for a validation run

This rubric grades a RUN of the protocol by an adopting team; it is
process guidance, not a repo-resident claim (so it carries no evidence
citations — see the acceptance criteria below for what this repository
itself delivers). A run is protocol-compliant when:

1. Baseline metrics are recorded for three to five work items.
2. Treatment metrics are recorded for three to five work items of
   comparable complexity, using identical metric definitions.
3. A comparison record exists that evaluates all four triggers
   against the data.
4. The comparison record is committed somewhere durable in the
   repository (an ADR or a doc).
5. Any decision flowing from the triggers (cut an artifact,
   simplify, keep, expand) is itself recorded as an ADR if it is
   architecturally significant.

## Acceptance criteria

The validation capability is delivered when:

1. [verified] The protocol is published in both languages —
   `docs/en/validation.md` and `docs/pt/validation.md`.
2. [verified] The protocol defines the seven required metrics with
   cohort-identical definitions and pairs every velocity metric with a
   quality metric — the table in `docs/en/validation.md`.
3. [verified] The four decision triggers are pre-declared with their
   thresholds (Faros 50%, AGENTbench 20%) — `docs/en/validation.md`.
4. [verified] The recording shape for baseline and treatment cohorts
   is documented with a concrete example record —
   `docs/en/validation.md`.
5. [verified] The tooling half of the protocol ships in the CLI:
   `doctrina metrics` snapshots and diffs local git-derived metrics —
   `packages/doctrina-cli/src/commands/metrics.js`, proven by
   `packages/doctrina-cli/test/integration.test.js`.
6. [verified] The packed-install harness drives init, spec, work, delta, check, close, and archive with the installed binary and asserts the gates at each step — `scripts/e2e-packed.mjs`.
7. [verified] Pointed at the commit preceding the fixes, the harness reproduces the adapter data loss, the failing adapter check, the born-stale index, the ungated apply, and the git first-run error — `scripts/e2e-packed.mjs`.

## Out of scope for this spec

- Automated collection of the seven protocol metrics (deploy counts,
  incidents, PR review times). `doctrina metrics` supplies only local
  git-derived proxies; the protocol metrics are recorded by the team.
- Statistical methodology beyond pre-declared thresholds.
- Cross-team or cross-project aggregation.
