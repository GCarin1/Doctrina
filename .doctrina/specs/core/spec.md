# Spec — Core Framework Structure

**Capability:** core
**Status:** active
**Last updated:** 2026-06-03
**Version:** 0.1.0

## Purpose

Define the canonical layout, file roles, and read-path rules that any
Doctrina-compliant repository must follow. This is the spec the CLI
scaffolds and the validator checks.

## Requirements (EARS)

### Ubiquitous

- The system shall expose `AGENTS.md` at the repository root as the portable,
  agent-readable source of truth for operational rules.
- The system shall expose `.doctrina/product.md` as the high-level vision and
  scope statement for the project.
- The system shall expose `.doctrina/specs/<capability>/spec.md` files,
  each representing the current truth of a single capability.
- The system shall expose `.doctrina/decisions/NNNN-<slug>.md` files as
  immutable Architecture Decision Records in the Nygard/MADR format.
- The system shall expose `.doctrina/changes/` for active change proposals
  and `.doctrina/changes/archive/` for applied changes.
- The system shall expose `.doctrina/index.json` containing metadata for
  every artifact (id, status, version, last_updated, owner).
- The system shall expose `.doctrina/skills/<slug>.md` files
  (optional) as on-demand procedural memory — specialised
  "how to do X" knowledge loaded only when relevant. Empty
  directories may use `.gitkeep`.

### Event-driven

- When a change proposal is created, the system shall place it under
  `.doctrina/changes/<id>/` containing at minimum `proposal.md`, `tasks.md`,
  and any `specs/<capability>/delta.md` files affected.
- When a change is applied, the system shall merge each delta into the
  corresponding `.doctrina/specs/<capability>/spec.md` and move the change
  folder to `.doctrina/changes/archive/YYYY-MM-DD-<id>/`.
- When an ADR is superseded, the system shall create a new ADR and update
  the old ADR's status header to `superseded by NNNN` with a bidirectional
  link; the old ADR file content shall not otherwise be modified.

### State-driven

- While an ADR has `Status: accepted`, the system shall treat it as binding
  context for agents and humans.
- While an ADR has `Status: superseded` or `Status: deprecated`, the system
  shall exclude it from the default agent read path but keep it on disk.
- While a change folder lives under `changes/archive/`, the system shall
  exclude it from the default agent read path.

### Unwanted-behavior (must-not)

- The system shall not edit the content of an accepted ADR. Decisions are
  changed by superseding, never by mutation.
- The system shall not introduce a runtime database, vector store, or
  retrieval-augmented generation layer in v0 or v1.
- The system shall not require a `memory/` folder in v0 or v1.
- The system shall not run multiple agents in parallel against the same
  writable artifact.

### Optional

- Where a project hosts multiple subsystems, the system may add nested
  `AGENTS.md` files at subsystem roots; the nearest AGENTS.md to the file
  being edited takes precedence.

## Acceptance criteria

A repository is Doctrina-compliant when:

1. `AGENTS.md` exists at the root and is under 150 lines.
2. `.doctrina/product.md` exists and states vision, scope, and target users.
3. At least one `.doctrina/specs/<capability>/spec.md` exists.
4. `.doctrina/decisions/`, `.doctrina/changes/`, `.doctrina/changes/archive/`,
   `.doctrina/templates/`, and `.doctrina/index.json` exist (folders may be
   empty with a `.gitkeep`).
5. Every ADR carries a `Status:` header and, if not accepted, a link to its
   replacement.

## Out of scope for this spec

- The exact JSON schema of `index.json` (a candidate for its own future spec).
- Per-agent adapter file layouts (covered by the `templates` spec).
- The CLI command surface (covered by the `cli` spec).
