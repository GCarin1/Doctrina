# Spec — Quality Gates and Insight Commands

**Capability:** gates
**Status:** active
**Implementation:** implemented
**Realizes:** n/a — internal framework capability; product success criteria measure adopting-team outcomes, not the tool's own surface
**Last updated:** 2026-07-02
**Version:** 0.2.0

## Purpose

Define the semantics of the gate, read-path, and insight commands: the
checks that decide whether the artifact tree is honest (`validate`,
`coverage`, `trace`, `review`, `verify`, `analyze`, `clarify`), the
read-only commands that assemble context or insight from artifacts
other files own (`context`, `search`, `show`, `prime`, `handoff`,
`status`, `why`, `constitution`, `report`), and the drivers that
sequence them (`close`, `doctor`). Split out of the `cli` spec when
that spec crossed its own 400-line cap; the `cli` spec keeps the
command surface, scaffolding/workflow commands, and the surface-wide
constraints (exit codes, zero-deps, no-network).

## Requirements (EARS)

### Ubiquitous

- The system shall keep every gate deterministic: gates check structure
  and cited evidence, and shall leave semantic fidelity judgement to
  the executing agent or human (ADR 0005).
- The system shall treat `verify` as the build gate and `validate` as
  the structural gate; the shipped pre-commit hook runs only the
  latter.

### Event-driven

- When `doctrina analyze <change-id>` runs, the system shall
  inspect the change folder at `.doctrina/changes/<change-id>/`
  and report on: proposal.md presence and presence of a "## Why"
  section; tasks.md presence and presence of at least one
  unchecked `[ ]` task; design.md presence (informational); each
  spec delta's Operation header validity and target spec path
  resolution. Exit 0 when no `✗` lines, 1 otherwise. The command
  does not modify any files.
- When `doctrina clarify <path>` runs, the system shall read the
  Markdown file at `<path>` and emit a per-line warning for each
  occurrence of a weasel word, vague quantifier (not immediately
  followed by a number), placeholder token (`TBD`/`TODO`/`FIXME`/`XXX`/`???`),
  or empty `## Acceptance criteria` section. Matches inside fenced
  code blocks, HTML comments, and inline backtick spans shall be
  skipped. Exit 0 when no smells are found, 1 otherwise. The
  command does not modify the file. The weasel-word set excludes
  `may` because the EARS Optional grammar legitimately uses
  "the system may ..." and an unfiltered match would render the
  command unusable on EARS-formatted specs.
- When `doctrina clarify --all` runs, the system shall scan every
  living document — `product.md`, capability specs, open changes,
  and skills — in one pass and exit 1 when any smell is found.
  ADRs and the change archive shall be excluded.
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
- When `doctrina coverage` runs, the system shall report per spec how
  many `## Acceptance criteria` cite an evidence path (a backtick file
  token) that exists, marking each covered, conditional (the only
  resolving proof is a test file whose suite is skipped), dangling (cited
  path missing), or bare (none cited); it exits 0 as a report and 1 under
  `--strict` when any criterion is bare, dangling, or conditional
  (ADR 0008).
- When `doctrina trace` runs, the system shall map `product.md` intent
  anchors (`- [SC1] ...`) to specs that declare `**Realizes:**`, reporting
  dropped intent, dangling realizes, and untraceable active specs; it exits
  0 as a report and 1 under `--strict` when any provenance break exists.
- When `doctrina verify` runs, the system shall execute each check in
  `.doctrina/verify.json` in order, stream its output, and exit non-zero
  if any fails (no config exits 1, pointing at `--init`; `--list` prints
  without running). This build gate is distinct from `validate` and never
  runs in the pre-commit hook.
- When a `verify.json` check declares `"type": "manual"`, the system shall
  not run a command for it but treat it as a qualitative gate: it passes
  when signed off (recorded in `.doctrina/verify.signoffs.json`) and is
  otherwise reported as pending — non-blocking by default, failing only
  under `--strict`. `doctrina verify --signoff "<name>=<note>"` shall record
  today's sign-off for a declared manual check and exit (review 2026-06-27).
- When `doctrina verify --clean` runs, the system shall not execute the
  configured checks but instead lint the project's `package.json` files
  for reproducibility footguns — an entry point under a build-output dir
  with no `prepare`/`prepack`, and a Prisma dependency with no
  `postinstall`/`prepare` generate step — exiting 1 on any risk and 0 when
  clean, so "verify green" cannot hide a clean checkout that won't build
  (ADR 0008).
- When `doctrina review` runs, the system shall report structural
  conformance breaks between the working tree (or `--diff <ref>`) and the
  spec/ADR/contract tree — code changed under a capability whose spec was
  not updated, changed code mapping to no capability, acceptance criteria
  citing missing proof, dropped product intent, and contract collisions —
  exiting 0 as a report and 1 under `--strict` when any hard break exists;
  it never judges semantic fidelity (review 2026-06-27).
- When `doctrina close <id>` runs, the system shall drive the closing
  sequence in one pass — analyze → change apply → verify (skipped with a
  note when no `verify.json`) → coverage `--strict` → trace (advisory) →
  change archive → validate — stopping at the first failure with the exact
  command to rerun, and exit non-zero on that failure (review 2026-06-27).
- When `doctrina status` runs, the system shall print a read-only health
  dashboard — index drift, framework stamp, coverage %, trace anchors,
  whether verify is configured, and the artifact counts — and always exit 0
  (a fast summary, not the authoritative gate) (review 2026-06-27).
- When `doctrina why <capability>` runs, the system shall print that
  capability's provenance chain — the product intent it `Realizes:`, its
  purpose and status, its acceptance criteria with cited proof, the
  accepted ADRs that name it, and a History section listing the archived
  changes whose recorded `specs_affected` include the capability (from the
  index ledger, oldest first) — read-only (review 2026-06-27).
- When `doctrina why <anchor>` runs with an intent anchor (`SC1`-shaped),
  the system shall print the reverse chain — the anchor's `product.md`
  text, the capabilities whose `Realizes:` names it (each with status,
  implementation state, and proof ratio), and the archived changes behind
  those capabilities — read-only, erroring with the known anchors when
  the anchor does not exist.
- When `doctrina constitution` runs, the system shall print the project's
  standing rules in one read — the accepted ADRs (immutable governing
  decisions, oldest first) and the `## Non-goals` of `product.md` — assembled
  read-only from artifacts those files already own (no new fact home); it
  never writes and always exits 0.
- When `doctrina context [<capability>]` runs, the system shall
  print the context pack in the documented read order — AGENTS.md,
  `product.md`, the capability spec when given (or every active spec
  when no capability is named, so the current truth is never absent),
  open changes, ADRs with status `accepted` — with per-file line counts
  and token estimates (chars/4) plus the pack total, and a separate
  on-demand list of skills (name, description, and when-trigger only,
  never the body). The change archive and non-accepted ADRs shall
  be excluded. With `--concat`, the system shall print the file
  contents with path separators instead of the list. The command
  is strictly read-only.
- When `doctrina context --budget <n>` runs, the system shall compare
  the pack's token estimate against the budget, report over/under —
  on stderr under `--concat`, keeping stdout pipeable — and exit 1
  when the estimate exceeds the budget.
- When `doctrina context --diff <ref>` runs inside a git repository,
  the system shall restrict the stable artifacts (AGENTS.md,
  `product.md`, specs, accepted ADRs) to those changed since `<ref>`
  (including untracked files), while open changes remain always
  included; a missing repository or unresolvable ref shall produce a
  clear error and exit 1.
- When `doctrina search <term> [...]` runs, the system shall report
  lines where every term matches case-insensitively, grouped by artifact
  category (specs, decisions, changes, skills, product, AGENTS.md) and
  ranked best-first within each category (heading, metadata-header,
  full-phrase, and filename matches score higher), excluding the change
  archive unless `--archive` is supplied, and shall exit 0 when matches
  exist and 1 otherwise. The command is strictly read-only.
- When `doctrina show <ref>` runs, the system shall resolve
  `<cap>-R<n>` to the nth requirement bullet of that spec (file order,
  printed with its EARS section name), `<cap>-C<n>` to the acceptance
  criterion carrying that explicit number (with its cited evidence), a
  four-digit number to the matching ADR, and a bare capability name to
  the spec's header block plus Purpose — read-only, exiting 1 for an
  unresolvable reference and 2 for a malformed one.
- When `doctrina prime` runs, the system shall print the session
  primer — the gate digest, artifact counts, accepted ADR titles with
  the non-goal count, open changes with task progress, and the top
  next actions — assembled read-only from artifacts that already own
  each fact, and always exit 0.
- When `doctrina handoff` runs, the system shall print a Markdown
  handoff note — the gate digest, each open change with its unchecked
  tasks and exact resume command, and the prioritised next actions —
  as a view derived from the tree at call time, never written to disk,
  and always exit 0.
- When `doctrina doctor` runs, the system shall drive the diagnostic
  set — `validate` (machine-read), the index drift check, the
  coverage/trace ratios, `verify --clean`, `templates check`, and the
  verify-config presence — reporting each area with its exact
  remediation command, adding no checks of its own, and exit 1 when
  any area fails (advisory findings stay exit 0).
- When `doctrina report [--since <days>]` runs, the system shall print
  a Markdown digest for the window (default seven days) — gate state,
  changes archived in the window from the index ledger, open work with
  task progress, artifact counts, and a local-git summary that
  degrades silently outside a repository — read-only, with no network.
- When `doctrina status`, `validate`, `coverage`, or `trace` runs with
  `--json`, the system shall emit the same data the human rendering
  shows as JSON with a stable shape, while preserving the command's
  exit semantics.

### Unwanted-behavior (must-not)

- The gate commands shall not modify any file, with two documented
  exceptions: `validate --fix` regenerates `.doctrina/index.json` from
  the tree, and `verify --signoff` records a sign-off in
  `.doctrina/verify.signoffs.json`.
- The gates shall not certify semantic fidelity; a green gate means the
  structure and the cited evidence hold, never that the prose is true
  (ADR 0005, ADR 0008).

## Acceptance criteria

The gate surface is spec-compliant when:

1. [verified] Every gate command listed under "Event-driven" runs and
   produces the documented effect — proven by
   `packages/doctrina-cli/test/integration.test.js`.
2. [verified] `doctrina validate` exits 0 against this repository's own
   `.doctrina/` tree (self-check) — implemented in
   `packages/doctrina-cli/src/commands/validate.js`.
3. [verified] `doctrina coverage --strict` and `doctrina trace --strict`
   exit 0 against this repository — the gates hold on the framework
   itself; see `packages/doctrina-cli/src/commands/coverage.js` and
   `packages/doctrina-cli/src/commands/trace.js`.
4. [verified] The hub-drift and self-certified-criterion gates are
   regression-tested — `packages/doctrina-cli/test/commands.test.js`.

## Out of scope for this spec

- The command surface, exit-code conventions, and scaffolding/workflow
  commands (covered by the `cli` spec).
- The content of `verify.json` checks — those are project-declared, not
  framework-defined.
- Semantic fidelity judgement of any artifact (ADR 0005).
