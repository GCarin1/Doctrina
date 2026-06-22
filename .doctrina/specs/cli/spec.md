# Spec — Command-Line Interface

**Capability:** cli
**Status:** active
**Implementation:** implemented
**Last updated:** 2026-06-22
**Version:** 0.18.0

## Purpose

Define the v0 command surface for the `doctrina` CLI, the contracts each
command honours, the implementation constraints the package follows, and
the exit-code conventions across the surface. The surface comprises
`init` (with optional `--from <path>` and `--intake <file>`),
`intake` (with optional `--text`), `work` (with optional
`--capability`/`--id`/`--resume`/`--from-diff`/`--chore`),
`spec new|list|set` (with
optional `--bug`), `change new|apply|archive|diff|abandon`,
`decision new|accept|land|supersede|list`, `skill new|list|sync`,
`contract new|list|check`, `analyze`, `clarify` (with optional `--all`),
`validate` (with optional `--fix`), `coverage` and `trace` (each with
optional `--strict`), `verify` (with optional `--init`/`--list`/`--clean`),
`templates list|check|update`, `hooks install`, `index rebuild`,
`next`, `metrics`, `context`, `search`, `--help`, and `--version`.

## Requirements (EARS)

### Ubiquitous

- The system shall expose the executable `doctrina` via the `bin` field
  of `packages/doctrina-cli/package.json`.
- The system shall implement every command using only the Node.js
  standard library; the runtime dependency list shall remain empty.
- The system shall print a usage summary when invoked with `--help`,
  `-h`, or with no arguments.
- The system shall print the package version when invoked with
  `--version` or `-v`.
- The system shall exit 0 on success and a non-zero code on error.
- The system shall prefix every error line with `error:` and may
  emit an optional `hint:` line with an actionable next step.

### Event-driven

- When the user invokes an unknown top-level command or
  subcommand, the system shall suggest the closest match by edit
  distance when one exists within a threshold of three.

- When `doctrina init` runs in a directory that contains neither
  `AGENTS.md` nor `.doctrina/`, the system shall scaffold the AGENTS.md
  template at the project root and the .doctrina/ skeleton from the
  templates directory.
- When `doctrina init --agent <name>` runs, the system shall additionally
  install the matching adapter from the templates inventory. The
  recognised values are `claude`, `codex`, `cursor`, `copilot`,
  `gemini`, `aider`, `windsurf`, `continue`, `amp`, `devin`,
  `factory`, `jules`, or `all` (install every adapter present
  under `templates/adapters/`). The last four (amp / devin /
  factory / jules) are AGENTS.md-native and install no files;
  the directory exists so the templates inventory is symmetric
  across supported agents.
- When `doctrina init --intake <file>` runs and `<file>` resolves to
  a non-empty file, the system shall store the file content verbatim
  at `.doctrina/intake.md` under a status header (`Status: pending`),
  absent `--project-description` derive the one-line description from
  the file's first non-empty line, and print the bootstrap playbook
  inline (the same one `doctrina intake` prints) so the conversion is a
  single command. A missing or empty `<file>` shall produce a clear
  error and write no files.
- When `doctrina init` scaffolds a project, the `AGENTS.md` it writes
  shall instruct any AGENTS.md-aware agent to detect a pending
  `.doctrina/intake.md` and execute the bootstrap playbook on its own
  before other work, so a freshly initialised project converts from
  intent to specs without per-step prompting.
- When `doctrina intake <file>` (or `doctrina intake --text "<text>"`)
  runs, the system shall store the description verbatim at
  `.doctrina/intake.md` with `Status: pending` and print the
  agent-executed bootstrap playbook (see ADR 0005): fill `product.md`,
  derive capabilities, `spec new` plus EARS per capability, run the
  quality gates, and flip the intake to `converted`. The CLI performs
  no natural-language interpretation of the description.
- When `doctrina intake` runs with no source and a pending
  `.doctrina/intake.md` exists, the system shall reprint the bootstrap
  playbook; when the intake is already `converted`, it shall say so and
  point at `doctrina work`; when no intake exists, it shall exit with a
  clear error.
- When `doctrina work "<prompt>"` runs, the system shall derive a
  sequential change id of the form `NNNN-<slug>` (the next number across
  open and archived changes; the slug an ASCII-folded kebab-case of the
  prompt), scaffold the change folder via the same path as
  `change new`, record the prompt verbatim under the proposal's
  `## Why`, rank existing specs by deterministic term overlap as a
  capability hint, and print the agent-executed work playbook (context →
  spec delta → tasks → implement → analyze → apply → verify →
  archive → validate). With `--capability <cap>` the system shall pin that
  capability instead of ranking, and with `--id <id>` it shall use the
  given id instead of deriving one. The CLI's language processing is
  limited to slugging and case-insensitive term counting; all semantic
  work is the executing agent's.
- When `doctrina work --resume <id>` runs, the system shall reprint the
  work playbook for that open change and create nothing; and when the
  prompt is a bare resume word (`continue`, `prossiga`, `next`, ...) while
  an open change exists, the system shall suggest resuming it rather than
  opening a change named after that word, unless `--force` is supplied.
  The resume-word set is a fixed deterministic stoplist, not language
  understanding.
- When `doctrina work --from-diff` runs inside a git repository, the
  system shall read the working-tree changes (tracked and untracked),
  require no prompt, record the changed files under the proposal's
  `## Why`, rank capabilities by those files, and print a code-first
  backfill playbook (write the spec describing the existing code, each
  criterion `[unverified]` until proven). With no working-tree changes it
  exits 1 (ADR 0010).
- When `doctrina work --chore` (alias `--no-spec`) runs, the system shall
  open a spec-less chore change and print a playbook that omits the
  spec-delta steps (ADR 0010).
- When `doctrina spec new <capability>` runs, the system shall create
  `.doctrina/specs/<capability>/spec.md` from `templates/spec.md.template`
  and add the entry to `.doctrina/index.json`.
- When `doctrina spec set <capability>` runs with at least one of
  `--implementation`, `--status`, `--bump major|minor|patch`, or
  `--criterion "<n>:<mark>"`, the system shall apply those bounded ops to
  the spec headers (and criterion mark), stamp `Last updated`, and
  regenerate `.doctrina/index.json` from the tree so the spec and index
  never drift — all ops or none, leaving the spec untouched on any error
  (ADR 0007/0009). With no edit flag it exits 2.
- When `doctrina change new <id> "<title>"` runs, the system shall create
  `.doctrina/changes/<id>/` populated with `proposal.md`, `tasks.md`,
  and `design.md` from the change templates. With `--chore` (alias
  `--no-spec`) it shall mark the proposal spec-less (`Affects specs:
  (none — chore)`) for infra/docs/build changes that still earn a
  proposal + ledger (ADR 0010).
- When `doctrina change apply <id>` runs, the system shall process every
  spec delta under the change folder: ADDED writes the new spec, REMOVED
  deletes the target spec, and MODIFIED carrying a fenced `ops` block
  (`set-header` / `bump-version` / `set-criterion` / `replace-criterion`
  / `append-criterion`) is applied mechanically to the target spec —
  all ops or none, refusing to write and exiting 1 when any op errors —
  while a MODIFIED delta with no `ops` block prints a manual-merge
  pointer without writing (ADR 0007). On any spec write the system shall
  regenerate `.doctrina/index.json` from the tree so the index never
  drifts from the applied spec.
- When `doctrina change abandon <id>` runs, the system shall delete the
  open change folder and its `.doctrina/index.json` entry, append a
  one-line abandonment record to `.doctrina/changes/archive/LEDGER.md`
  (with the optional `--reason "<text>"`), and rebuild the index from the
  tree. It is the inverse of `change new`.
- When `doctrina change archive <id>` runs, the system shall move the
  change folder to `.doctrina/changes/archive/YYYY-MM-DD-<id>/` and
  update `.doctrina/index.json`.
- When `doctrina decision new "<title>"` runs, the system shall create
  the next sequentially numbered ADR from the decision template.
- When `doctrina decision supersede <number>` runs, the system shall
  create a new ADR that supersedes the target, and update only the
  `Status:` and `Superseded by:` headers of the target ADR.
- When `doctrina decision land <number> [path ...]` runs against an
  accepted ADR, the system shall stamp the `Landed:` header with the date
  and cited proof, leave the decision body untouched, and refuse otherwise.
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
- When `doctrina hooks install` runs inside a git repository, the
  system shall write `.git/hooks/pre-commit` from the hooks
  template, mark it executable, and refuse to overwrite an
  existing hook unless `--force` is supplied.
- When `doctrina hooks install` runs outside a git repository
  (no `.git/` in cwd), the system shall exit with a clear error
  and shall not write any files.
- When `doctrina analyze <change-id>` runs, the system shall
  inspect the change folder at `.doctrina/changes/<change-id>/`
  and report on: proposal.md presence and presence of a "## Why"
  section; tasks.md presence and presence of at least one
  unchecked `[ ]` task; design.md presence (informational); each
  spec delta's Operation header validity and target spec path
  resolution. Exit 0 when no `✗` lines, 1 otherwise. The command
  does not modify any files.
- When `doctrina spec new <capability> --bug` runs, the system
  shall scaffold the capability spec from
  `templates/spec-bug.md.template` instead of
  `templates/spec.md.template`.
- When `doctrina validate` runs, the system shall parse each
  capability spec and ADR for Markdown link targets, and shall
  emit a warning for any path token that looks like a
  repository-relative file path and does not exist on disk.
  URLs, anchors, wildcards, placeholder patterns, folder-style
  paths (ending with `/`), and backtick spans are excluded.
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
- When `doctrina init --from <path>` runs and `<path>` resolves
  to a directory, the system shall use `<path>/AGENTS.md` (if
  present) as the base for the new project's root AGENTS.md and
  shall fold `<path>/.doctrina/product.md` (if present) into the
  new project's product.md before applying the standard
  template scaffolding.
- When `doctrina init --from <path>` runs and `<path>` does not
  resolve to a directory, the system shall exit with a clear
  error and shall not write any files. The `--from` flag accepts
  only local filesystem paths; URLs, git references, and remote
  sources are out of scope.
- When `doctrina templates list` runs, the system shall walk the
  framework-bundled template tree and print each template's
  relative path and line count. The command is strictly
  read-only and shall not modify any files.
- When `doctrina templates check` runs, the system shall compare
  the project's `AGENTS.md`, `.doctrina/product.md`, and
  `.doctrina/index.json` against the recommended section
  headings and schema fields shipped in the current CLI version
  and report any recommended section that is missing. The
  command is strictly read-only and shall not modify any files.
  It exits 0 when no missing sections are found, 1 otherwise.
- When `doctrina skill new <name>` runs, the system shall
  scaffold `.doctrina/skills/<name>.md` from the skill template
  and index the new artifact under `artifacts.skills` in
  `.doctrina/index.json`.
- When `doctrina skill list` runs, the system shall print one
  line per skill containing the slug and the description from
  frontmatter. The command is strictly read-only.
- When `doctrina skill sync` runs, the system shall copy each
  skill's frontmatter `description:` into the matching
  `artifacts.skills` entry of `.doctrina/index.json`, indexing
  any skill present on disk but absent from the index. Skills
  without a `description:` field are reported and skipped. The
  frontmatter is the source of truth; the command never edits
  skill files.
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
- When `doctrina change diff <id>` runs, the system shall print,
  for each spec delta in the change: for ADDED, the target path
  and the delta body line count; for REMOVED, the target path to
  be deleted; for MODIFIED, a line-level diff between the current
  target spec and the delta body, with the caveat that the delta
  body is a fragment to merge, so context lines absent from the
  delta are not removals. The command is strictly read-only.
- When `doctrina index rebuild` runs, the system shall regenerate
  `.doctrina/index.json` from the artifacts on disk — spec
  headers, ADR headers, change proposals, archive folder names,
  and skill frontmatter — stamping the running `framework_version`
  (migrating a stale stamp) and preserving `project`,
  `$schema_version`, and any field that has no on-disk source
  (product metadata is carried over from the existing index). The
  files are the source of truth; the index is a derived artifact.
- When `doctrina index rebuild --check` runs, the system shall
  write nothing, print a drift summary per artifact category,
  and exit 1 when the regenerated index differs from the one on
  disk, 0 otherwise.
- When `doctrina next` runs, the system shall inspect the
  `.doctrina/` tree and print the recommended next workflow
  actions in priority order: a pending `.doctrina/intake.md`
  (not yet `converted`), open changes (missing proposal,
  unchecked tasks, deltas ready to apply, applied but not
  archived), ADRs still in `proposed` status, and index drift.
  When no work is open the system shall say so and point at
  `change new` and `spec new`. The command is strictly read-only
  and shall exit 0.
- When `doctrina metrics` runs inside a git repository, the
  system shall derive adoption metrics from local git history
  only — commit count, revert count and rate, Conventional-Commit
  fix share, top-churn files, and a 21-day re-edit proxy rate —
  for the window given by `--since` (a day count or a
  git-parseable date; default 90 days).
- When `doctrina metrics --save` runs, the system shall write the
  snapshot to `.doctrina/metrics/YYYY-MM-DD.json` and, when a
  prior snapshot exists, print the deltas against the most recent
  one.
- When `doctrina metrics` runs outside a git repository, the
  system shall exit with a clear error and shall not write any
  files.
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
- When `doctrina change archive <id>` runs, the system shall
  append a one-line summary (date, id, title, affected specs) to
  `.doctrina/changes/archive/LEDGER.md`, creating the ledger on
  first use. The CLI only appends; it never rewrites existing
  ledger lines.
- When `doctrina templates update` runs, the system shall print
  an additive-only update plan — recommended sections missing
  from `AGENTS.md` and `.doctrina/product.md`, and missing
  `index.json` schema fields or artifact categories — and shall
  write nothing, exiting 1 while updates are pending and 0 when
  the project already follows the current template shape.
- When `doctrina templates update --write` runs, the system shall
  apply the plan by appending stub sections and adding missing
  fields; the system shall not rewrite or remove any existing
  user content.
- When `doctrina spec list` runs, the system shall print one line
  per capability spec containing id, version, status, line count,
  and last-updated date, read from the spec headers. The command
  is strictly read-only.
- When `doctrina decision accept <number>` runs against an ADR
  whose status is `proposed`, the system shall rewrite only the
  `Status:` header to `accepted` and update the index entry. Any
  other current status shall produce a clear error and no writes.
- When `doctrina decision list` runs, the system shall print one
  line per ADR containing number, status, date, and title, read
  from the ADR headers. The command is strictly read-only.
- When `doctrina context [<capability>]` runs, the system shall
  print the context pack in the documented read order — AGENTS.md,
  `product.md`, the capability spec when given, open changes,
  ADRs with status `accepted` — with per-file line counts, plus a
  separate on-demand list of skills (name and description only,
  never the body). The change archive and non-accepted ADRs shall
  be excluded. With `--concat`, the system shall print the file
  contents with path separators instead of the list. The command
  is strictly read-only.
- When `doctrina search <term> [...]` runs, the system shall report
  lines where every term matches case-insensitively, grouped by artifact
  category (specs, decisions, changes, skills, product, AGENTS.md) and
  ranked best-first within each category (heading, metadata-header,
  full-phrase, and filename matches score higher), excluding the change
  archive unless `--archive` is supplied, and shall exit 0 when matches
  exist and 1 otherwise. The command is strictly read-only.
- When `doctrina clarify --all` runs, the system shall scan every
  living document — `product.md`, capability specs, open changes,
  and skills — in one pass and exit 1 when any smell is found.
  ADRs and the change archive shall be excluded.
- When `doctrina validate` runs, the system shall walk
  `.doctrina/skills/` and emit a warning for any skill missing
  one or more of the required frontmatter fields (`name`,
  `description`, `when`), any skill over the 200-line cap, and
  any skill whose `name:` field does not match its filename
  slug.
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
- When `doctrina verify --clean` runs, the system shall not execute the
  configured checks but instead lint the project's `package.json` files
  for reproducibility footguns — an entry point under a build-output dir
  with no `prepare`/`prepack`, and a Prisma dependency with no
  `postinstall`/`prepare` generate step — exiting 1 on any risk and 0 when
  clean, so "verify green" cannot hide a clean checkout that won't build
  (ADR 0008).
- When `doctrina contract new <name>` runs, the system shall scaffold
  `.doctrina/contracts/<name>.md` and index it under
  `artifacts.contracts`; `doctrina contract check` shall error on a port
  collision or a missing referenced `specs/<capability>`, and warn when a
  declared environment variable is absent from `.env.example`.
- When `doctrina change archive <id>` runs, the system shall refuse
  (exit 1) while any checkbox in `tasks.md` (closing steps included) or
  the proposal's `## Verification` section is unchecked, unless `--force`
  is supplied — which archives and records the gap.
- When `doctrina validate` runs, the system shall additionally warn when
  a capability spec is `Status: active` with `Implementation: planned` and
  no note; when an ADR's `Evidence:` cites a missing path or an accepted
  ADR cites none; and when a contract file is absent from the index; and
  shall fail when `LEDGER.md` and `index.json.changes_archive` disagree.

### State-driven

- While a destination file already exists, the system shall refuse to
  overwrite it unless `--force` is supplied.
- While the current working directory does not contain `.doctrina/`,
  every command except `init`, `--help`, and `--version` shall exit
  with a clear error.

### Unwanted-behavior (must-not)

- The system shall not depend on any package outside the Node.js
  standard library at runtime.
- The system shall not mutate the body of an accepted ADR; only the
  `Status:` and `Superseded by:` headers may be rewritten, and only by
  the `decision accept` and `decision supersede` commands.
- The system shall not auto-merge arbitrary MODIFIED spec prose; only a
  delta's declared, bounded `ops` block (headers and acceptance-criteria
  markers) is applied mechanically (ADR 0007), and any other MODIFIED
  body is left for the user to merge.
- The system shall not write outside the project working directory.
- The system shall not emit telemetry or make network calls.
- The hook installed by `doctrina hooks install` shall do no work
  beyond invoking `doctrina validate`. Lint, tests, and
  project-specific checks are out of scope for the shipped hook.

### Optional

- Where the output is connected to a TTY and `NO_COLOR` is not set, the
  system may emit ANSI colour codes; otherwise output shall be plain
  text.
- Where the user supplies `--non-interactive`, the system may exit with
  an error rather than prompting for missing required values.

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success, including validation with warnings only |
| 1 | Validation errors, or a command-level failure |
| 2 | Misuse: unknown command, missing required argument |

## Acceptance criteria

The CLI is v0 spec-compliant when:

1. [verified] Every command listed under "Event-driven" runs and
   produces the documented effect — proven by
   `packages/doctrina-cli/test/integration.test.js`.
2. [verified] `node --test packages/doctrina-cli/test/` exits 0 —
   the suite at `packages/doctrina-cli/test/integration.test.js`.
3. [verified] `doctrina validate` exits 0 against this repository's own
   `.doctrina/` tree (self-check) — implemented in
   `packages/doctrina-cli/src/commands/validate.js`.
4. [verified] `npm pack --dry-run` inside `packages/doctrina-cli/` lists
   only `src/`, `templates/` (copied from `.doctrina/templates/` by the
   `prepack` script), `README.md`, and `package.json` in the published
   tarball — governed by `packages/doctrina-cli/package.json`.
5. [verified] The runtime `dependencies` field of the package is absent
   or `{}` — see `packages/doctrina-cli/package.json`.

## Out of scope for this spec

- Remote operations, network calls, telemetry.
- Auto-merging arbitrary MODIFIED prose; only the bounded `ops` block
  (headers and criteria markers) is applied — semantic rewriting stays
  the agent's job (ADR 0005, ADR 0007).
- A full EARS grammar parser inside `validate`; v0 ships
  section-shape checks (When/While/Where/shall placement), not a
  complete grammar.
- An interactive TUI mode; v0 ships readline prompts only.
