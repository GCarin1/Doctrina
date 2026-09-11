# Spec — The Structural Gate

**Capability:** structure
**Status:** active
**Implementation:** implemented
**Realizes:** n/a — internal framework capability; product success criteria measure adopting-team outcomes, not the tool's own surface
**Source:** `packages/doctrina-cli/src/commands/validate.js`, `packages/doctrina-cli/src/lib/{ears,pipeline}.js`
**Last updated:** 2026-09-11
**Version:** 0.1.0

## Purpose

Define what `doctrina validate` refuses: the grammar of the `.doctrina/`
tree itself. Schema and shape, the artifact-existence contract between
`index.json` and the disk, the EARS form of every requirement, the
pipeline declaration, the metadata domains, and the soft caps that bound
a reading budget.

This is the gate that answers "is this tree well-formed", asked before
any gate that answers "is this tree proven". It was split out of the
`gates` spec when that spec crossed its 400-line cap for the second
time — `validate` alone was a quarter of it, and the largest cluster
there that names a capability on its own.

`gates` keeps the gates that judge EVIDENCE and drive a change to done —
`coverage`, `trace`, `review`, `verify`, `analyze`, `clarify`, `close`,
`doctor`, `ci`. A requirement that constrains `validate` **and** one of
those stays there, with the cross-cutting claim it belongs to.

## Requirements (EARS)

### Event-driven

- When `doctrina validate` runs and `.doctrina/rules.json` exists, the
  system shall enforce each rule — a forbid-regex over glob-scoped paths —
  as an error carrying the rule's own message, capped per rule to keep a
  mass violation readable; an invalid rules file shall be a single error
  (ADR 0014).
- When `doctrina validate` runs, the system shall print every error and
  warning it finds and exit 0 only when zero errors are present.
- When `doctrina validate` runs, the system shall emit a warning for
  each capability spec over 400 lines and for each ADR over 300
  lines (soft caps; warnings only).
- When `doctrina validate` runs, the system shall walk
  `.doctrina/specs/` and `.doctrina/decisions/` and emit a warning
  for any file present on disk but not referenced in
  `.doctrina/index.json` (orphan detection; warnings only).
- When `doctrina validate` runs, the system shall warn for any known
  metadata key in a spec's header block (`Capability`, `Status`,
  `Implementation`, `Version`, `Last updated`, `Realizes`) not written in
  the canonical `**Key:** value` form — the silent non-parse footgun
  (warnings only; ADR 0010).
- When `doctrina validate` runs, the system shall error when two ADR files
  share the same `NNNN` number (a merge-time allocation collision; the
  index keys decisions by number).
- When `doctrina validate` runs, the system shall warn when
  `.doctrina/index.json` records a `framework_version` absent or behind the
  running CLI (stamp divergence; warnings only).
- When `doctrina validate` runs against a capability spec whose `Status` is
  `active` and which is on the implementation axis (has an `Implementation`
  header) but declares no `Realizes:` header, the system shall warn that the
  capability traces to no product intent — silenced by any `Realizes:` value,
  including a deliberate `n/a — <why>` (provenance-adoption nudge; warnings
  only).
- When `doctrina validate` runs, the system shall parse each
  capability spec and ADR for Markdown link targets, and shall
  emit a warning for any path token that looks like a
  repository-relative file path and does not exist on disk.
  URLs, anchors, wildcards, placeholder patterns, folder-style
  paths (ending with `/`), and backtick spans are excluded.
- When `doctrina validate` runs, the system shall regenerate the index
  from the tree and emit an error for any artifact present in both the
  index and the tree (specs, decisions, changes, changes_archive,
  contracts) whose recorded metadata no longer matches its file — so a
  green `validate` cannot hide the drift `index rebuild --check` would
  catch (G5). Presence drift (orphan / missing file), the
  `framework_version` stamp, and skill descriptions stay advisory
  (warnings / `skill sync`). With `--fix` the system shall rebuild the
  index from the tree before validating instead of erroring (ADR 0009).
- When `doctrina validate` runs, the system shall compare each
  skill's frontmatter `description:` against the description
  recorded in `.doctrina/index.json` and emit a warning on
  mismatch, pointing at `doctrina skill sync` (warnings only).
- When `doctrina validate` runs against a capability spec that
  declares a `## Requirements (EARS)` section, the system shall
  emit a warning for each requirement whose shape does not match
  its section's EARS grammar: Ubiquitous requirements carry
  "shall" and no When/While/Where prefix, Event-driven start with
  "When", State-driven start with "While", Unwanted-behavior
  carry "shall" plus a negation, Optional start with "Where" and
  use "may". Bug-shape and free-form specs are skipped
  (warnings only).
- When `doctrina validate` runs, the system shall apply the
  AGENTS.md size caps (warning over 150 lines, error over 200)
  to every nested AGENTS.md found below the project root,
  skipping dependency, build, and VCS directories.
- When `doctrina validate` runs, the system shall walk
  `.doctrina/skills/` and emit a warning for any skill missing
  one or more of the required frontmatter fields (`name`,
  `description`, `when`), any skill over the 200-line cap, and
  any skill whose `name:` field does not match its filename
  slug.
- When `doctrina validate` runs, the system shall additionally warn when
  a capability spec is `Status: active` with `Implementation: planned` and
  no note; when an ADR's `Evidence:` cites a missing path or an accepted
  ADR cites none; and when a contract file is absent from the index; and
  shall fail when `LEDGER.md` and `index.json.changes_archive` disagree.
- When `doctrina validate` runs, the system shall compare the doctrina
  commands documented in `AGENTS.md` against the real CLI surface and warn
  when AGENTS.md references a command that does not exist, and — for an
  AGENTS.md that documents a command catalog and does not defer to
  `doctrina --help` — when it omits commands the CLI ships (hub-freshness;
  warnings only).
- When `doctrina validate` runs against an acceptance criterion marked
  `[verified]` that cites no proof path (read across continuation lines so a
  proof on a later line still counts), the system shall warn that the
  criterion is self-certified (honest gates, ADR 0008; warnings only).
- When `doctrina validate` runs in a project holding both `docs/en/` and
  `docs/pt/`, the system shall warn for any Markdown file present in one
  language tree and missing from the other (translation parity, both
  directions; warnings only — projects without both trees are exempt).
- When `doctrina validate` runs with `--strict`, the system shall count every warning as a failure and exit 1, and shall name `--strict` as the cause when it found no error.

### Unwanted-behavior (must-not)

- The system shall not propose or write `verified` for a spec on the strength of a criterion whose author marked it `[unverified]`, whether the proposal comes from `validate` or the write from `spec set --implementation auto`.
- The system shall not write a `framework_version` stamp lower than the one the index already carries; an older CLI that rebuilds the index keeps the newer stamp, `validate` reports a stamp ahead of the running CLI as a reason to upgrade the CLI rather than to rebuild, and `index rebuild --check` does not count a stamp ahead as index drift.

## Acceptance criteria

1. [verified] `doctrina validate` exits 0 against this repository's own
   `.doctrina/` tree (self-check) — implemented in
   `packages/doctrina-cli/src/commands/validate.js`.
2. [verified] A fully proven spec still marked planned is warned about by `validate`, and a half-proven spec claiming verified is warned about in the other direction — verified by `packages/doctrina-cli/test/implementation-derived.test.js`.
3. [verified] The orphan note fires per file even when another changed file matched, and `validate` reports a pattern that matches nothing — verified by `packages/doctrina-cli/test/code-has-an-owner.test.js`.
4. [verified] A hand-written `Status: bogus` and a `[banana]` mark are reported by `validate` as errors naming the legal values, while `planned — deferred` passes — verified by `packages/doctrina-cli/test/a-header-has-a-domain.test.js`.
5. [verified] A freshly scaffolded contract and a freshly scaffolded skill each draw one validate warning naming the placeholder, and the warnings go silent once the rows and the frontmatter are written — verified by `packages/doctrina-cli/test/a-scaffold-is-not-an-artifact.test.js`.
6. [verified] A loose `specs/legacy.md`, a `specs/orfao/` without `spec.md` and a `specs/carteira/spec-old.md` each draw one validate warning with the canonical path, while a `notes.md` beside a `spec.md` is silent — verified by `packages/doctrina-cli/test/a-spec-off-the-path-is-named.test.js`.
7. [verified] A stamp ahead of the running CLI survives `validate --fix` and `index rebuild`, is named by validate as "upgrade the CLI", and `index rebuild --check` exits 0 over it, while a stamp behind is still migrated — verified by `packages/doctrina-cli/test/the-stamp-does-not-regress.test.js`.
8. [verified] `validate --strict` exits 1 on a tree whose only finding is a warning, exits 0 on a tree with nothing to say, and reports the mode it ran in under `--json` — verified by `packages/doctrina-cli/test/integration.test.js`.

## Out of scope for this spec

- The gates that judge evidence and provenance, and the drivers that
  sequence them — `coverage`, `trace`, `review`, `verify`, `analyze`,
  `clarify`, `close`, `doctor`, `ci` (covered by the `gates` spec),
  including any requirement that constrains one of them together with
  `validate`.
- The checks themselves as a data model — `lib/validation-model.js` and
  `lib/doc-model.js` are owned by the `validation` spec. That the command
  and its model answer to different capabilities predates this split and
  is not settled by it; consolidating them is a decision of its own.
- The command surface and exit-code conventions (covered by the `cli`
  spec).
