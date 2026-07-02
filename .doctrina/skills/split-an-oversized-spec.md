---
name: split-an-oversized-spec
description: Split a capability spec that crossed the 400-line cap into two coherent capabilities without losing provenance.
when: doctrina validate warns that a spec exceeds the 400-line soft cap, or a spec accretes a second responsibility.
---

# Skill — split-an-oversized-spec

## When to use this skill

- `doctrina validate` warns `spec.md is NNN lines (>400 soft cap)`.
- A spec's Event-driven section reads as two unrelated clusters.

## Procedure

Do not compress prose to sneak under the cap — split along a
responsibility seam. (Precedent: `cli` 551 lines → `cli` 399 +
`gates` 227, 2026-07-02.)

1. Find the seam: group the Event-driven requirements by theme and
   pick the largest coherent cluster that names a capability on its
   own (for `cli` it was "gate/insight command semantics").
2. Create the new spec folder and file by hand or via
   `doctrina spec new <new-cap>`; give it real headers: `Status`,
   `Implementation` (match reality), `Realizes:` (an `[SCn]` anchor
   or a deliberate `n/a — <why>` so `doctrina trace` stays green).
3. MOVE the requirement blocks verbatim — do not rewrite EARS prose
   while moving (one change, one intent). Keep each section's EARS
   grammar intact so the validate shape check stays quiet.
4. Give the new spec its own `## Acceptance criteria` with resolving
   evidence (see the `write-acceptance-evidence` skill); move any
   criterion that belongs to the moved cluster and renumber what
   remains in the source spec.
5. In the source spec: add a one-line pointer in `## Purpose` and an
   `## Out of scope` bullet naming the new capability; in the new
   spec: point back the same way. No fact may live in both files.
6. `doctrina spec set <old-cap> --bump minor` — it stamps
   `Last updated` and rebuilds `index.json`, registering the new
   spec in the same pass.
7. Update anything that counts specs (`README.md`, `README.pt.md`)
   and run the gates: `validate` (cap warning gone), `trace`
   (anchors intact), `coverage --strict` (both specs cite proof).

## Anti-patterns

- Deleting requirements to fit the cap — the cap is a reading
  budget, not permission to lose the contract.
- Splitting by grammar section (all Event-driven here, the rest
  there) instead of by responsibility: both halves stay incoherent.
- Forgetting `Realizes:` on the new spec — it becomes the only
  untraceable capability and `trace --strict` goes red.

## Related material

- `.doctrina/specs/cli/spec.md` and `.doctrina/specs/gates/spec.md` —
  the executed example.
- ADR 0007 (structured spec deltas); ADR 0009 (index resync).
