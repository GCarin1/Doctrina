# Changelog

All notable changes to Doctrina are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Versioning policy

- `0.x.y` — pre-1.0 development. Public CLI surface and on-disk
  artifact shapes may change between minor versions.
- `1.0.0` — first stable release. After 1.0, breaking changes to
  the CLI surface, the `.doctrina/` layout, the templates
  contract, or `index.json` schema require a major version bump
  and a migration note in this file.
- Patch (`x.y.Z`) bumps are reserved for backward-compatible bug
  fixes and documentation updates.

## [Unreleased]

## [0.4.0] — 2026-06-19

Framework-review follow-ups: tighten the framework's own hygiene where
guardrails were missing, and start closing the intent→spec→test loop.

### Added

- `doctrina trace` — intent-provenance report (ADR 0006). Tag `product.md`
  bullets with an anchor (`- [SC1] ...`) and declare `**Realizes:** SC1` on
  the specs that deliver them; `trace` reports dropped intent (an anchor no
  spec realizes), dangling realizes, and untraceable specs. Read-only;
  `--strict` gates. Composes with `coverage` into the chain *intent →
  capability → criterion → test*. It checks that the link is complete, not
  that a criterion is faithful to the intent (that stays a human/LLM call).
- Clarification gate (review Topic A): `doctrina intake` and `doctrina work`
  flag a thin / under-specified description or prompt (too few words, no
  concrete terms, or heavy vague/weasel wording) and ask the agent to clarify
  with the user before converting to specs or writing deltas. Advisory, never
  blocking — the intake/change is still captured.
- `doctrina decision land <number> [path ...]` — record that an accepted
  ADR is now implemented by stamping a non-mutating `Landed:` header (date
  plus cited proof) without editing the immutable decision body. Closes the
  gap where a design-time ADR ("Evidence: n/a — no implementation yet") had
  no first-class way to note that reality caught up, short of a heavyweight
  supersede.
- `index.json` now records the `framework_version` that manages it: it is
  stamped on every write and on `init`. `doctrina validate` warns when the
  stamp is absent or behind the running CLI, and `doctrina index rebuild`
  migrates it.
- `doctrina validate` errors when two ADR files share the same `NNNN`
  number — the merge-time allocation collision that previously let one
  decision silently shadow another in the index.

### Changed

- `doctrina search` now ranks results best-first within each category
  (heading / metadata-header / full-phrase / filename matches score higher)
  and shows the highest-scoring lines per file, instead of returning the
  first matches unordered.
- `doctrina validate` evidence check now also reads the `Landed:` header:
  an accepted ADR is only flagged "no evidence" when both `Evidence:` and
  `Landed:` are empty, and dangling citations in either are reported.

### Fixed

- `doctrina change apply` left the change entry's `status` in `index.json`
  at `proposed` while flipping `proposal.md` to `applied`, so the index
  drifted from the tree in the whole apply→archive window (a pre-commit
  `index rebuild --check` would fail there). The entry now mirrors the
  proposal, for both delta and metadata-only applies.

## [0.3.0] — 2026-06-16

Closes the gap between what a spec promises and what the code/tests prove.
A framework review found Doctrina validated **form, not truth**: the docs
could look finished while the system was half-built, and `validate` passed.
This release adds the truth-checking guardrails. Every new gate has an
opt-in or `--force` escape hatch — block, never imprison.

### Added

- **Two-axis spec status.** A capability spec now carries an
  `Implementation:` state (`planned`/`partial`/`implemented`/`verified`)
  independent of the document `Status:`. `spec list` shows both;
  `validate` warns when an `active` spec is still `planned` with no note
  (an inventory claim with nothing behind it). New specs scaffold honestly
  as `draft`/`planned`.
- **`doctrina coverage`.** Reports, per spec, how many acceptance criteria
  cite an evidence path (a backtick file token) that exists — covered,
  dangling (cited path missing), or bare (none cited). A report by default
  (exit 0); a CI gate under `--strict`.
- **`doctrina verify`.** Runs the project-declared build checks from
  `.doctrina/verify.json` (typecheck/test/build) through the shell and
  fails on any non-zero — the real "does the code work" gate, distinct
  from the structural `validate` and never run by the pre-commit hook.
  `--init` scaffolds the config, `--list` prints it.
- **Contract artifact (`doctrina contract new|list|check`).** A
  first-class home under `.doctrina/contracts/` for the integration/
  runtime surface no capability owns — port map, environment, interfaces.
  `contract check` fails on a port collision or a missing referenced spec,
  and warns when a declared env var is absent from `.env.example`.
- **ADR `Evidence:` header.** Anchors a decision to the files that prove
  it; `validate` warns when cited evidence is missing on disk (decision
  drift) or when an accepted ADR cites none.
- **Spec template `## Maturity` boundary** (MVP vs aspirational) and
  `[verified]`/`[unverified]` acceptance-criteria markers, so a product
  wishlist cannot be smuggled in as committed EARS requirements.

### Changed

- **`doctrina change archive` now enforces verification.** It refuses
  (exit 1) while any `tasks.md` checkbox (closing steps included) or any
  item in the proposal's `## Verification` checklist is unchecked, unless
  `--force` is passed (which archives and records the gap). "Done" is no
  longer honour-based.
- **`doctrina validate` cross-checks the archive ledger against
  `index.json.changes_archive`** and fails on divergence — two sources of
  truth for the same history can no longer silently disagree.
- Proposal template ships a `## Verification` checklist; product template
  ships a "Delivery order (walking skeleton)" section (depth before
  breadth — verify one end-to-end slice before fanning out capabilities).

## [0.2.0] — 2026-06-13

### Added

- **Agent-executed playbooks: `doctrina intake` and `doctrina work`**
  (ADR 0005). Two commands collapse the per-feature ceremony by handing
  the natural-language half to the AI agent that runs them, while the
  CLI stays offline and zero-dependency. `intake <file>` (or
  `init --intake <file>`) stores the full project description verbatim
  at `.doctrina/intake.md` and prints the bootstrap playbook the agent
  executes to fill `product.md`, derive capabilities, and author one
  EARS spec each before flipping the intake to `converted`;
  `init --intake` prints that playbook inline so the conversion is a
  single command. `work "<prompt>"` turns a brief prompt into a
  scaffolded change — a sequential `NNNN-slug` id, the prompt recorded
  as the proposal's `## Why`, existing specs ranked by deterministic
  term overlap as a capability hint — then prints the work playbook
  (context → delta → tasks → implement → analyze → apply → archive →
  validate). The scaffolded `AGENTS.md` now instructs any
  AGENTS.md-aware agent to detect a pending intake and run the bootstrap
  on its own, and `doctrina next` surfaces a pending intake ahead of all
  other work. The CLI's own language processing is capped at slugging
  and case-insensitive term counting; everything semantic is the
  agent's. Bilingual docs (cli-reference, workflow) and integration
  tests included — the suite is now 82.
- **Documentation site.** Zero-build Docsify shell at
  `docs/index.html`, served straight from the `docs/` folder via
  GitHub Pages: bilingual EN/PT with per-language sidebars,
  full-text search, language-aware landing pages with a 5-minute
  usage walkthrough, and new Contributing and Donations pages in
  both languages. The Markdown stays the artifact; the site is a
  view (docs spec bumped to 0.2.0 to permit exactly this and no
  build pipeline). `.github/FUNDING.yml` added for the GitHub
  Sponsor button.
- **Project logo.** The `{D}` monogram — doctrine inside the
  developer's braces — chosen as the official mark; ships as
  plain SVG at `docs/assets/logo-monogram.svg` and is used by
  the docs site and the README. The deferred-register logo entry
  is updated to record the resolution.
- **`doctrina context [<capability>]` (with `--concat`).** The
  AGENTS.md read order turned into tooling: prints the exact
  context pack for a task — root rules, product, the capability
  spec, open changes, accepted ADRs — with line counts, plus an
  on-demand skill list (name + description only). `--concat`
  prints the contents, ready to hand to an agent. Archive and
  non-accepted ADRs excluded by design.
- **`doctrina search <term> [...]` (with `--archive`).**
  Category-grouped, case-insensitive search across specs,
  decisions, changes, skills, product, and AGENTS.md. Answers
  "where is X decided?" without knowing the tree layout.
- **`doctrina decision accept <number>` and `decision list`.**
  Accepting an ADR no longer requires a hand edit; only the
  `Status:` header is rewritten. `doctrina next` now points at
  the command. `list` enumerates ADRs with status, date, title.
- **`doctrina spec list`.** Specs with version, status, line
  count, and last-updated, read from the headers.
- **`doctrina clarify --all`.** One-pass smell sweep over every
  living document (product, specs, open changes, skills); ADRs
  and the archive stay out. CI-friendly exit code.
- **`doctrina index rebuild` (with `--check`).** Regenerates
  `index.json` from the artifacts on disk — spec headers, ADR
  headers, change proposals, archive folder names, skill
  frontmatter. The files are the source of truth; the index is now
  a derived artifact. `--check` is CI-friendly: writes nothing,
  exits 1 on drift with a per-category summary.
- **`doctrina next`.** Read-only state machine over the tree:
  prints the recommended next workflow actions in priority order
  (open changes, unchecked tasks, deltas ready to apply,
  applied-but-unarchived, ADRs stuck in proposed, index drift).
  Lets agents and humans resume work without re-reading the tree.
- **`doctrina change diff <id>`.** Read-only preview of every spec
  delta: summary for ADDED/REMOVED, unified line diff (zero-dep
  LCS) between the target spec and the delta body for MODIFIED.
- **`doctrina metrics` (with `--since`, `--save`).** Local-only
  adoption metrics derived from git history: commits, revert rate,
  Conventional-Commit fix share, top-churn files, 21-day re-edit
  proxy. `--save` snapshots to `.doctrina/metrics/` and prints
  deltas against the previous snapshot. No network calls — the
  tooling half of the validation A/B protocol.
- **EARS shape checks in `validate`** (#17). Every spec declaring
  `## Requirements (EARS)` gets per-section grammar checks:
  When/While/Where placement and shall/may usage (warnings only).
  Dogfooding immediately caught two real defects in this repo's
  own specs: an event-shaped requirement filed under Ubiquitous in
  the cli spec, and a State-driven requirement without "shall" in
  the skills spec. Both fixed.
- **Nested `AGENTS.md` size caps in `validate`** (#18). The
  "nearest AGENTS.md wins" hierarchy was documented but never
  enforced; nested files now get the same 150/200-line caps as
  the root, with dependency/build/VCS directories skipped.
- **Archive ledger.** `change archive` appends a one-line summary
  (date, id, title, affected specs) to
  `.doctrina/changes/archive/LEDGER.md` — scannable episodic
  memory without opening archive folders or putting them back on
  the default read path. Append-only.
- **`doctrina templates update`.** Additive-only fixer for what
  `templates check` reports: preview by default (exits 1 while
  pending, writes nothing), `--write` to apply, never rewrites or
  removes existing content. This lifts the deferred-register item
  at exactly the bar it set (opt-in + dry-run preview); the
  register entry is updated accordingly.
- Integration tests for all of the above (64 tests total).
- **`doctrina skill sync`.** Mirrors each skill's frontmatter
  `description:` into `.doctrina/index.json`, removing the last
  edit-the-index-by-hand step in the skill workflow. The
  frontmatter is the single source of truth.
- **Two `validate` checks.** #15 warns when a capability spec's
  `Version:` header drifts from the version recorded in
  `index.json`; #16 warns when a skill's frontmatter description
  drifts from the indexed one (pointing at `skill sync`).
- **ADR 0002 tombstone.** Records that the number was consumed by
  a pre-foundation draft and never published, so the ADR sequence
  is contiguous and self-explaining.
- Integration tests for `decision supersede`, the MODIFIED-delta
  manual-merge path of `change apply`, `skill sync`, and both new
  validate checks.

### Fixed

- `change archive` recorded the change id instead of the title in
  the index for ids containing hyphens (the documented `NNNN-slug`
  convention): the proposal-title regex stopped at the first
  hyphen. Found by `index rebuild --check` during dogfooding.
- The `init` index template now ships the `skills: []` category
  (older indexes without it compare equal — no action needed).
- **Documentation coherence.** Adapter counts unified everywhere
  to the actual surface (12 supported agents: 7 thin-pointer
  adapters + 5 AGENTS.md-native) — `product.md`, `adapters.md`,
  `local-llms.md`, `comparison.md`, `migration.md`, `deferred.md`
  and the package README previously disagreed (3 vs 8 vs 12).
  Command count restated as "10 commands (16 operations)".
- **Research citations sourced.** The BrowseComp 80%-of-variance
  and 15× token-cost figures now link their source (Anthropic
  engineering blog) and are worded to pass `doctrina clarify` on
  merit instead of hiding inside backtick spans.
- `index.json` spec versions resynchronised with the `Version:`
  headers on disk (cli, templates, skills).
- Root `.doctrina/skills/` directory now exists, matching the
  skeleton the README describes.
- Templates inventory README now lists all 12 adapters, the skill
  and bug-spec templates, and the hooks samples.
- CLI spec acceptance criterion for `npm pack` updated to include
  the `templates/` directory shipped since the 0.1.0 release fix.
- Windows behaviour of the pre-commit hook documented (runs under
  Git Bash; executable bit is a no-op on NTFS).

## [0.1.0] — 2026-06-03

First public release. Establishes the foundation, the templates,
the CLI, the documentation, and the empirical validation
protocol. Built dogfooded — every artifact in this release was
produced via the framework's own change workflow.

### Added

- **Framework foundation.** Root `AGENTS.md` (open standard),
  `.doctrina/` artifact tree, `product.md`, five capability
  specs (`core`, `templates`, `cli`, `docs`, `validation`), three
  architectural ADRs (`0001` AGENTS.md adoption, `0003` defer
  `memory/`, `0004` single linear orchestrator).
- **CLI** (`doctrina`, zero runtime dependencies, Node.js 20.12+):
  `init`, `spec new` (with `--bug`), `change new|apply|archive`,
  `decision new|supersede`, `analyze`, `clarify`, `validate`,
  `hooks install`.
- **Templates.** AGENTS.md template, `.doctrina/` skeleton,
  capability spec, bug-shape spec, change folder contents
  (proposal/tasks/design/spec-delta), ADR (Nygard/MADR),
  per-agent adapters for Claude Code, OpenAI Codex CLI, and
  Cursor, pre-commit hook template, on-save watcher template.
- **Documentation** (English-primary, Portuguese translations of
  every file). Twelve docs: getting-started, workflow,
  cli-reference, adapters, multi-agent model, context
  engineering, gating, antipatterns, validation, glossary,
  brownfield, comparison.
- **Quality gates.** `doctrina validate` ships eleven checks
  including size warnings, orphan detection, and stale-reference
  detection (Markdown link targets that no longer exist on
  disk). `doctrina analyze` inspects a change folder before
  applying. `doctrina clarify` smell-tests Markdown for weasel
  words, vague quantifiers, and placeholders.
- **Empirical validation protocol.** The `validation` capability
  spec defines seven metrics (DORA four plus rework rate,
  cost-per-feature, PR review time) and four pre-declared
  decision triggers. The validation doc walks teams through the
  four-step procedure manually; the harness is deferred until at
  least one project executes the protocol.
- **CI.** GitHub Actions workflow runs the test suite and
  self-validation on every push to `main` and every pull request.
- **OSS hygiene.** This changelog, `CONTRIBUTING.md`, and
  `SECURITY.md`.

### Notable choices not made

- No `memory/` folder. Deferred per ADR 0003 until measured
  empirical pain justifies the complexity.
- No role-based parallel agents. Rejected per ADR 0004 on the
  basis of the Cognition and Anthropic research findings about
  multi-agent fan-out for code work.
- No runtime dependencies. The CLI deliberately uses only Node
  standard library imports.
- No telemetry, no network calls, no analytics endpoints. See
  `SECURITY.md`.

### Known limitations at 0.1.0

- Native agent support is limited to Claude Code, OpenAI Codex
  CLI, and Cursor. Other agents read AGENTS.md natively but do
  not get a Doctrina adapter at install time.
- The CI matrix runs only on Ubuntu. macOS and Windows will be
  added in 0.2.0.
- No `npm publish` workflow ships in 0.1.0. The package is
  installable from source; the publish workflow lands in 0.2.0.
- Examples folder includes two reference projects (a
  Python FastAPI service and a TypeScript Express retrofit);
  the leading competitors ship dozens.
