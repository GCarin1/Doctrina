# Spec — Core Framework Structure

**Capability:** core
**Status:** active
**Implementation:** implemented
**Realizes:** SC3, SC4
**Source:** `packages/doctrina-cli/src/lib/{dates,fs-ops,lock}.js`
**Last updated:** 2026-07-02
**Version:** 0.3.0

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
- The system shall offer one reading of a file's line ending — CRLF when the file carries one, LF otherwise — and one way to write text back in it, so a command that rewrites a file a person owns keeps the ending the file already uses.
- The system shall read every text file with LF line endings whatever the file stores, and shall write an existing file back with the line ending it already has, so that a checkout storing CRLF answers every command as its LF twin and a rewrite never mixes endings.
- The system shall write `index.json` whole — to a temporary file moved over it — and shall read the next change number and create the change folder under one project lock, so that commands run at the same moment neither read half an index nor open two changes under one number.

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
3. At least one capability spec exists — in this repository, e.g.
   `.doctrina/specs/core/spec.md` and `.doctrina/specs/cli/spec.md`.
4. `.doctrina/decisions/`, `.doctrina/changes/`, `.doctrina/changes/archive/`,
   `.doctrina/templates/`, and `.doctrina/index.json` exist (folders may be
   empty with a `.gitkeep`).
5. Every ADR carries a `Status:` header and, if not accepted, a link to its
   replacement — enforced as an error by the Status-header check in
   `packages/doctrina-cli/src/commands/validate.js`.
6. [verified] The line ending helpers read CRLF, LF and an empty file, and turn a mixed text into one ending either way — verified by `packages/doctrina-cli/test/um-arquivo-crlf-continua-crlf.test.js`.
7. [verified] A CRLF file is read as LF and rewritten as CRLF; a CRLF project validates with the output of its LF twin and a change cycle leaves the spec, the proposal and the tasks CRLF throughout; eight `doctrina work` at once exit 0 with eight numbers, eight index entries and no lock left — verified by `packages/doctrina-cli/test/a-setima-auditoria-fecha-fim-de-linha-conflito-e-concorrencia.test.js`.

## Out of scope for this spec

- The exact JSON schema of `index.json` (a candidate for its own future spec).
- Per-agent adapter file layouts (covered by the `templates` spec).
- The CLI command surface (covered by the `cli` spec).
