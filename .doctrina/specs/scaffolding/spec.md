# Spec — Project Scaffolding and Maintenance

**Capability:** scaffolding
**Status:** active
**Implementation:** implemented
**Realizes:** n/a — internal framework capability; product success criteria measure adopting-team outcomes, not the tool's own surface
**Depends on:** cli
**Source:** `packages/doctrina-cli/src/commands/{init,adapter,templates,hooks,index-rebuild,upgrade,watch,metrics,completion}.js`, `packages/doctrina-cli/src/lib/{adapters,scan,index-json,metrics-model,usage,config}.js`
**Last updated:** 2026-09-11
**Version:** 0.8.0

## Purpose

Define the semantics of the commands that MATERIALISE and MAINTAIN a
Doctrina project, as opposed to the ones that author artifacts inside
it: `init` and `adapter` (bootstrap), and `templates`, `hooks`,
`index`, `upgrade`, `watch`, `metrics` and `completion` (maintenance).
What these commands share is a target — the tree and the agent-facing
files themselves — and a constraint: they are additive, and they never
rewrite content a human authored.

Split out of the `cli` spec when that spec crossed its 400-line cap a
second time and began to squeeze accepted decisions out of its own
context pack (ADR 0022). The `cli` spec keeps the command surface, the
authoring commands, and the conventions every command shares.

## Requirements (EARS)

### Ubiquitous

- The system shall carry index.json's config block through an index rebuild, since it has no on-disk source to be rederived from.
- The system shall read every project configuration option — the language, the context budget, and the project rules — through one reader, resolving each option from `.doctrina/config.json` first, then from the legacy location for that option, then from the built-in default, and shall report which of the three each effective value came from.
- The system shall write the pre-commit hook so that it invokes the CLI that installed it, by absolute path, and shall honour a `DOCTRINA` environment variable as the override, because `.git/hooks/` is local to the clone and a `doctrina` found on the PATH may be an older release.
- The system shall write an artifact into the index in the position a full rebuild would give it, comparing the way the directory walk compares, so that the incremental write and the rebuild never disagree.

### Event-driven

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

- When `doctrina hooks install` runs inside a git repository, the
  system shall write `.git/hooks/pre-commit` from the hooks
  template, mark it executable, and refuse to overwrite an
  existing hook unless `--force` is supplied.

- When `doctrina hooks install` runs outside a git repository
  (no `.git/` in cwd), the system shall exit with a clear error
  and shall not write any files.

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

- When `doctrina index rebuild` regenerates the index — or `doctrina init`
  scaffolds one — the artifact tree shall record the root `AGENTS.md` under
  `artifacts.entrypoint`, so a tool enumerating `index.json` can reach the
  hub the agent reads first, not only the artifacts the hub points at.

- When `doctrina watch` runs, the system shall re-run `validate --fix` and
  reprint `doctrina next` on every change under `.doctrina/` (debounced,
  ignoring the `index.json` the fix rewrites) until interrupted; `--once`
  shall run a single pass and exit (review 2026-06-27).

- When `doctrina completion <shell>` runs with `bash`, `zsh`, or `pwsh`,
  the system shall print a completion script generated from the operation
  catalog (commands and their subcommands; flags are not completed), and
  shall exit 2 for a missing or unrecognised shell.

- When `doctrina upgrade` runs, the system shall preview — and with
  `--write` apply — the steps that bring an existing project up to the
  installed CLI: additive `templates update`, index rebuild with
  `framework_version` stamp migration, and `validate` (`--fix` under
  `--write`); the preview shall exit 1 while steps are pending (ADR 0014).

- When `doctrina init` runs on an interactive terminal without `--agent`
  and without `--non-interactive`, the system shall offer the adapter
  install as a wizard prompt (default: none); the prompt shall never fire
  without a TTY, so scripted and CI invocations are unchanged.

- When `doctrina templates update --write` or `doctrina upgrade --write` runs, the system shall regenerate the marker-delimited doctrina:surface block of AGENTS.md from the installed command catalog — replacing a legacy hand-written surface section — while writing nothing outside the markers (ADR 0015).

- When `doctrina adapter add <name>` runs, the system shall write only that adapter's own files and shall leave `AGENTS.md`, `.doctrina/product.md`, and every other project artifact byte-identical.

- When `doctrina adapter list` runs, the system shall report each adapter as installed, available, or native, where native means the agent reads `AGENTS.md` directly and the adapter installs no file.

- When `doctrina adapter remove <name>` runs, the system shall delete only files that adapter created, shall keep any file edited since install unless `--force` is given, and shall then remove every directory it emptied, walking up and stopping at the first directory that still holds anything.

- When `doctrina init --force` would overwrite an `AGENTS.md` or `.doctrina/product.md` that carries authored content, the system shall refuse, name the files it declined to touch, point at `doctrina adapter add`, and write nothing; `--overwrite-content` shall be required to discard that content.

- When `doctrina init` has no project description and no terminal to ask on, the system shall refuse and name the flags that supply one, rather than scaffolding with an empty description.
- When `doctrina init` scaffolds a project, the system shall create `.doctrina/config.json` documenting every option and its default while declaring none of them, so that the first key a project adds is the first choice it has made.
- When `doctrina doctor` runs, the system shall print one row per configuration option with its effective value and its source, and shall never fail on account of an option sitting at its default.
- When `doctrina metrics --trend` runs, the system shall read every saved snapshot in date order and report the movement of each tracked rate from the first snapshot to the last, stating that the direction is not a verdict, and shall say so plainly when fewer than two snapshots exist.
- When `doctrina report` runs inside a repository with history, the system shall include the period's revert rate and re-edit rate, derived from the same snapshot `metrics` renders for that window.
- When `doctrina doctor` runs and the usage log named by the environment exists, the system shall report how many operations in the catalog were never invoked and name at most eight of them, pointing at `doctrina metrics --commands` for the rest; with no log, or an empty one, it shall report nothing about usage.
- When `doctrina init --intake-text "<text>"` runs, the system shall store the text verbatim as the project's intake, recording that its source was inline, and shall otherwise behave exactly as `--intake <file>` does.
- When `doctrina init` receives both `--intake` and `--intake-text`, the system shall report a usage error naming the two as alternatives, and scaffold nothing.
- When a project declares no capability spec and has no intake awaiting conversion, the system shall recommend the bootstrap command, naming the code-first alternative for a project adopting an existing codebase.

### State-driven

### Unwanted-behavior (must-not)

- The hook installed by `doctrina hooks install` shall do no work
  beyond invoking `doctrina validate --fix` and re-staging
  `.doctrina/index.json` when the fix rewrites it. Lint, tests, and
  project-specific checks are out of scope for the shipped hook.
- The system shall not fail to assemble a context pack, run a command, or scaffold a project because a configuration file is malformed; it shall fall back to the default for the affected option, keep working, and report the malformation through the structural gate.
- The system shall not create, populate, or require a usage log in order to report on one, and shall not treat an operation with no samples as a defect.
- The system shall not treat a value-taking intake flag written without a value as an absent one; it shall report a usage error and scaffold nothing, so a project is never created without the intake its operator asked for.
- The system shall not instruct an agent to check a condition that `init` does not leave on disk.

### Optional

## Acceptance criteria

Project scaffolding is spec-compliant when:

1. [verified] `adapter add` leaves `AGENTS.md` and `.doctrina/product.md` byte-identical, and an add/remove round trip returns the tree to its prior state — directories included, for an adapter that creates them — verified by `packages/doctrina-cli/test/integration.test.js`, `packages/doctrina-cli/test/adapter-leaves-no-trace.test.js`.] `adapter add` leaves `AGENTS.md` and `.doctrina/product.md` byte-identical, and an add/remove round trip returns the tree to its prior state — verified by `packages/doctrina-cli/test/integration.test.js`.
2. [verified] `init --agent <name> --force` on a project with authored content exits non-zero, names the files, and writes nothing; `--overwrite-content` still allows the discard — verified by `packages/doctrina-cli/test/integration.test.js`.
3. [verified] `adapter list` distinguishes installed, available, and native, and a native adapter installs nothing — verified by `packages/doctrina-cli/test/integration.test.js`.
4. [verified] A project's context_budget survives `index rebuild`, and --budget overrides it — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
5. [verified] A project configured the legacy way and one configured in `config.json` resolve to the same effective values, the declared home wins per option, and the source of each value is reported — verified by `packages/doctrina-cli/test/config-surface.test.js`.
6. [verified] `init` scaffolds a config that declares nothing, `doctor` prints every option with its value and origin, and a malformed file is reported by `validate` without stopping `context` — verified by `packages/doctrina-cli/test/config-surface.test.js`.
7. [verified] The saved snapshots are read as a series — malformed and non-snapshot files skipped — and the trend spans first to last rather than the last two — verified by `packages/doctrina-cli/test/metrics-feedback.test.js`.
8. [verified] `report` and `metrics` state the same rates for the same window, and `doctor` reports usage only when the log exists, creating nothing — verified by `packages/doctrina-cli/test/metrics-feedback.test.js`.
9. [verified] Scaffolding with an intake lands in the same tree and the same intake file as scaffolding then supplying one, differing only in the description `init` can derive when it holds the intake at scaffold time; the inline and file forms differ only in the recorded source — verified by `packages/doctrina-cli/test/init-intake.test.js`.
10. [verified] Immediately after `init`, `next` and `prime` name the bootstrap command, the hub's stated trigger matches what `init` writes, the action closes as soon as a capability exists, and a pending or converted intake never fires it — verified by `packages/doctrina-cli/test/bootstrap-door.test.js`.
11. [verified] A directory holding a kept file or a file the adapter never wrote survives the removal, and the pruning never escapes or removes the project root — verified by `packages/doctrina-cli/test/adapter-leaves-no-trace.test.js`.
12. [verified] The installed hook names the installing CLI's entrypoint and reads `DOCTRINA` first — verified by `packages/doctrina-cli/test/the-stamp-does-not-regress.test.js`.
13. [verified] A spec, a skill and an archived change that sort before an existing entry each land in walk order and leave `index rebuild --check` clean, punctuation included — verified by `packages/doctrina-cli/test/the-index-is-written-once.test.js`.

## Out of scope for this spec

- The command surface itself, the authoring commands, and the
  conventions every command shares (exit codes, flag declaration, the
  JSON envelope, zero runtime dependencies) — covered by the `cli`
  capability spec.
- Gate, read-path, and insight command semantics — covered by the
  `gates` capability spec.
