# CLI reference

Every command of the `doctrina` CLI, with flags and exit codes. Run
`doctrina <command> --help` for the same information at the terminal.

## Global flags

| Flag | Effect |
|------|--------|
| `--help`, `-h` | Print top-level usage, or per-command help if placed after a command. |
| `--version`, `-v` | Print the package version. |

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success (warnings allowed). |
| 1 | A command-level error: validation failed, file refused to overwrite, change not found, etc. |
| 2 | Misuse: unknown command, missing required argument, malformed input. |

## `doctrina init`

Scaffold `AGENTS.md` and the `.doctrina/` skeleton in the current
working directory.

```
doctrina init [options]
```

| Flag | Default | Purpose |
|------|---------|---------|
| `--project-name <name>` | basename of cwd | Override the project name written into artifacts. |
| `--project-description <text>` | empty (prompts) | One-sentence description. Omit `--non-interactive` to skip the prompt. |
| `--agent <name>` | none | Install the adapter for one of the twelve supported agents (`claude`, `codex`, `cursor`, `copilot`, `gemini`, `aider`, `windsurf`, `continue`, `amp`, `devin`, `factory`, `jules`) or `all`. AGENTS.md-native agents (`codex`, `amp`, `devin`, `factory`, `jules`) install no file. |
| `--from <path>` | none | Local conventions directory; folds its `AGENTS.md` and `.doctrina/product.md` (when present) into the new project before scaffolding. Filesystem paths only — no URLs. |
| `--intake <file>` | none | Full project description; stored verbatim at `.doctrina/intake.md`, used to derive the one-line description when `--project-description` is absent, and the bootstrap playbook is printed inline — no second command needed. The scaffolded `AGENTS.md` also tells any agent to run that playbook on its own when it sees a pending intake. |
| `--date <YYYY-MM-DD>` | system date | Override the date written into artifacts. |
| `--force` | off | Overwrite existing files. |
| `--non-interactive` | off | Fail instead of prompting for missing required values. |

`init` refuses to run if `AGENTS.md` or `.doctrina/` already exist
unless `--force` is supplied.

## `doctrina intake [<file>]`

Store the full project description verbatim at `.doctrina/intake.md`
and print the **bootstrap playbook** — the ordered instruction
sequence the host AI agent executes to turn that intent into
`product.md` content and capability specs. The CLI itself performs no
natural-language interpretation; the intelligence lives in the
executing agent (see ADR 0005).

```
doctrina intake description.md
doctrina intake --text "A shop with login, catalog, and checkout"
doctrina intake                       # reprint the playbook for a pending intake
```

| Flag | Purpose |
|------|---------|
| `--text "<description>"` | Inline description instead of a file. |
| `--force` | Overwrite an existing `.doctrina/intake.md`. |

The playbook steps: read the intake, fill every `product.md` section,
derive the capability list and run `spec new` + author EARS per
capability, record any forced ADRs, run `clarify --all` and `validate`,
then flip the intake header to `Status: converted`. After conversion
the specs are the only source of truth — the intake is never edited to
change requirements. Exits 1 when no source is given and no intake
exists.

## `doctrina work "<prompt>"`

Turn a brief prompt into a fully scaffolded change plus the **work
playbook** the host agent executes. The CLI derives a sequential change
id (`NNNN-<slug>`), opens the change folder via the same path as
`change new`, records the prompt verbatim under the proposal's
`## Why`, ranks existing specs by deterministic term overlap as a
capability hint, and prints the ordered steps: context → spec delta →
tasks → implement → analyze → apply → archive → validate. No
natural-language interpretation happens in the CLI (see ADR 0005).

```
doctrina work "add login with email and password"
doctrina work "tighten password rules" --capability auth
doctrina work "rework billing" --id 0042-billing-overhaul
```

| Flag | Purpose |
|------|---------|
| `--capability <cap>` | Pin the capability instead of ranking matches. |
| `--id <id>` | Override the derived change id. |
| `--force` | Overwrite an existing change folder. |

## `doctrina spec new <capability>`

Create a new capability spec from the spec template.

```
doctrina spec new billing
doctrina spec new checkout-flow --bug
```

Writes `.doctrina/specs/<capability>/spec.md` and adds an entry to
`.doctrina/index.json`. Capability names must match `[a-z][a-z0-9-]*`.

| Flag | Purpose |
|------|---------|
| `--bug` | Scaffold the bug-shape template (current / expected / unchanged behaviour) instead of the EARS capability spec. |
| `--force` | Overwrite an existing spec file. |

## `doctrina spec list`

One line per capability spec: id, version, status, line count, and
last-updated date, read from the spec headers.

```
doctrina spec list
```

Read-only. Pairs with `skill list` and `decision list`.

## `doctrina change new <id> "<title>"`

Open a change proposal.

```
doctrina change new 0042-add-saml "Add SAML login"
```

Writes `.doctrina/changes/<id>/` populated with `proposal.md`,
`tasks.md`, and `design.md`, plus an empty `specs/` directory ready
for delta files. Adds an entry to `.doctrina/index.json` under
`changes`.

The `<id>` is the directory name. Convention: `NNNN-slug`.

| Flag | Purpose |
|------|---------|
| `--force` | Overwrite an existing change folder. |

## `doctrina change apply <id>`

Apply every spec delta found under `.doctrina/changes/<id>/specs/`.

```
doctrina change apply 0042-add-saml
```

Semantics:

- **ADDED:** writes the delta body to the target spec. Refuses if
  the target already exists.
- **REMOVED:** deletes the target spec.
- **MODIFIED:** prints `manual[MODIFIED]` with a pointer; does not
  write. You merge the delta into the target spec by hand.

When every delta processed successfully (no errors and no MODIFIED
deltas) and at least one delta was written, the proposal's `Status:`
header flips from `proposed` to `applied` and an `Applied:` line is
added. Otherwise the proposal stays `proposed` until you resolve the
manual merges and re-run.

## `doctrina change archive <id>`

Move an applied change to
`.doctrina/changes/archive/YYYY-MM-DD-<id>/` and update the index.

```
doctrina change archive 0042-add-saml
```

The CLI does not require the change to be in `applied` state — you
can archive a proposal you decided not to ship, for example.

Archiving also appends a one-line summary (date, id, title,
affected specs) to `.doctrina/changes/archive/LEDGER.md` — the
cheap way to scan history without opening archive folders, which
stay out of the default read path. The CLI only appends; edit the
ledger freely.

## `doctrina change diff <id>`

Preview every spec delta in a change before applying it.

```
doctrina change diff 0042-add-saml
```

Per delta:

- **ADDED:** target path and delta body line count (flags a conflict
  when the target already exists).
- **REMOVED:** target path and the line count that would be deleted.
- **MODIFIED:** a unified line diff between the current target spec
  and the delta body. The delta body is a fragment to merge, so `-`
  lines are current spec content absent from the delta — context,
  not necessarily removals.

Read-only; never modifies files. Pairs with `analyze`: `analyze`
checks the change's shape, `diff` shows its content.

## `doctrina decision new "<title>"`

Create the next sequentially numbered ADR from the decision template.

```
doctrina decision new "Adopt event sourcing for ledger"
```

Writes `.doctrina/decisions/NNNN-<slug>.md` and adds an entry to
the index. New ADRs start with `Status: proposed`.

## `doctrina decision supersede <number> "<new title>"`

Create a new ADR that supersedes an existing one, and rewrite only
the `Status:` and `Superseded by:` headers of the old ADR.

```
doctrina decision supersede 0007 "Adopt CRDT-based ledger"
```

The body of the old ADR is never touched. The new ADR carries
`Supersedes: 0007` in its frontmatter.

## `doctrina decision accept <number>`

Flip a `proposed` ADR to `accepted`.

```
doctrina decision accept 0007
```

Rewrites only the `Status:` header — the body stays immutable — and
updates the index entry. Any other current status (already accepted,
superseded, withdrawn) is a clear error with no writes. Closes the
lifecycle that `decision new` opens; `doctrina next` points here
when an ADR is stuck in `proposed`.

## `doctrina decision list`

One line per ADR: number, status, date, and title, read from the
ADR headers.

```
doctrina decision list
```

Read-only.

## `doctrina skill new <name>`

Scaffold a new on-demand procedural memory skill at
`.doctrina/skills/<name>.md` and index it.

```
doctrina skill new db-migration
```

The slug must match `[a-z][a-z0-9-]*`. The template carries
frontmatter with `name`, `description`, and `when` fields; fill
those in, then run `doctrina skill sync` to mirror the
description into the index.

| Flag | Purpose |
|------|---------|
| `--force` | Overwrite an existing skill file. |

## `doctrina skill list`

Print one line per skill with slug and description from the
frontmatter.

```
doctrina skill list
```

Read-only. Never modifies any file. See
[skills.md](skills.md) for the design rationale.

## `doctrina skill sync`

Copy each skill's frontmatter `description:` into the matching
entry of `.doctrina/index.json`.

```
doctrina skill sync
```

The frontmatter is the single source of truth: edit the skill
file, run `sync`, and the index follows. Skills present on disk
but absent from the index are indexed; skills without a
`description:` field are reported and skipped. Never edits skill
files. `doctrina validate` warns when a description has drifted
from the index.

## `doctrina analyze <change-id>`

Inspect a change folder before applying it.

```
doctrina analyze 0042-add-saml
```

Reports per-line:

- `proposal.md` presence and presence of a `## Why` section.
- `tasks.md` presence and presence of at least one unchecked task.
- `design.md` presence (informational, optional).
- For each spec delta: `Operation:` header validity and target spec
  path resolution.

Exits 0 when no failures, 1 otherwise. Does not modify any files.

## `doctrina clarify <path>`

Smell-test a Markdown file for ambiguity.

```
doctrina clarify .doctrina/specs/billing/spec.md
```

Flags weasel words (`might`, `could`, `should probably`, `perhaps`,
`maybe`, `approximately`, `roughly`), vague quantifiers (`many`,
`few`, `some`, `several` when not followed by a number),
placeholders (`TBD`, `TODO`, `FIXME`, `XXX`, `???`), and empty
`## Acceptance criteria` sections.

`may` is deliberately not flagged: the EARS Optional grammar uses
"the system may ..." and an unfiltered match would make the
command noisy on every Doctrina spec.

Skips fenced code blocks, HTML comments, and inline backtick
spans. Exits 0 when no smells are found, 1 otherwise — useful as
a pre-PR gate in CI. Never modifies the file.

With `--all`, every living document is scanned in one pass:
`product.md`, capability specs, open changes, and skills. ADRs
(immutable) and the archive (history) are excluded. One command,
one exit code — wire it into CI next to `validate`.

## `doctrina templates list`

Enumerate the templates the installed Doctrina CLI ships.

```
doctrina templates list
```

Read-only. Prints each template's relative path under the
framework's template directory and its line count. Useful for
discovering what `init`, `spec new`, `change new`, and
`decision new` will scaffold from.

## `doctrina templates check`

Compare the current project against the recommended template
shape shipped in this CLI version.

```
doctrina templates check
```

Walks `AGENTS.md`, `.doctrina/product.md`, and
`.doctrina/index.json` and reports any recommended section or
schema field that is missing. Read-only; never modifies any
files. Exits 0 when every recommended section is present, 1
otherwise.

Distinct from `validate`: `validate` answers "is this a
well-formed Doctrina tree?"; `templates check` answers "does
this tree still follow the shape the current CLI's templates
recommend?" Run it after `npm install -g doctrina-cli@latest` to see
whether new template shapes added sections your existing files
have not yet adopted.

## `doctrina templates update`

Additive-only fixer for what `templates check` reports.

```
doctrina templates update [--write]
```

Preview is the default: the command prints the update plan —
recommended sections missing from `AGENTS.md` and
`.doctrina/product.md`, missing `index.json` schema fields or
artifact categories — writes nothing, and exits 1 while updates
are pending. With `--write` it appends stub sections (marked
`<!-- added by doctrina templates update — fill in -->`) and adds
the missing fields. Existing content is never rewritten or
removed; filling in the stubs stays a human decision.

## `doctrina hooks install`

Install the Doctrina pre-commit hook into `.git/hooks/pre-commit`.

```
doctrina hooks install [--force]
```

The hook runs `doctrina validate` and blocks the commit if it
exits non-zero. The CLI refuses to run outside a git repository
and refuses to overwrite an existing hook unless `--force` is
supplied. The installed hook is a POSIX shell script under 10
lines; edit it freely after install (the CLI will not overwrite
without `--force`).

On Windows the executable bit set by the installer is a no-op;
the hook runs under Git Bash (the default shell git-for-Windows
uses for hooks) but not under bare `cmd.exe`. WSL and PowerShell
with a POSIX shell available also work.

For on-save validation (Kiro Agent Hooks style), see
`.doctrina/templates/hooks/watch.sample`. It is a small shell
wrapper that pipes `doctrina validate` through a user-installed
file watcher (`entr`, `fswatch`, etc.). The CLI does not install
or run it; wire it into your dev setup by hand.

## `doctrina validate`

Run schema and structural checks against `.doctrina/`.

```
doctrina validate
```

Checks performed:

1. `AGENTS.md` exists and is ≤ 200 lines (warns at > 150).
2. `.doctrina/product.md` exists.
3. `.doctrina/index.json` parses and matches the v0.1 shape.
4. Every artifact referenced in the index exists at its declared path.
5. Every ADR has a parseable `Status:` header.
6. Every adapter template under `.doctrina/templates/adapters/` is
   ≤ 30 lines.
7. Every open change has a `proposal.md`.
8. Each capability spec is ≤ 400 lines (warning at > 400).
9. Each ADR is ≤ 300 lines (warning at > 300).
10. Every spec and ADR present on disk is referenced in `index.json`
    (orphan detection; warning if missing).
11. Markdown link targets inside specs and ADRs that do not exist on
    disk warn (stale-reference detection). Backtick paths are
    descriptive prose and are not checked.
12. Each skill carries the required frontmatter triple
    (`name`, `description`, `when`).
13. Each skill is ≤ 200 lines (warning at > 150).
14. Each skill's `name:` matches its filename slug.
15. Each capability spec's `Version:` header matches the version
    recorded in `index.json` (warning on drift).
16. Each skill's frontmatter description matches the description
    recorded in `index.json` (warning; `doctrina skill sync`
    restores it).
17. EARS grammar shape per section in every spec that declares
    `## Requirements (EARS)`: Ubiquitous requirements carry
    `shall` and no When/While/Where prefix, Event-driven start
    with `When`, State-driven with `While`, Unwanted-behavior
    carry `shall` plus a negation, Optional start with `Where`
    and use `may` (warnings only; bug-shape specs are skipped).
18. Nested `AGENTS.md` files below the root obey the same size
    caps as the root file (warning > 150 lines, error > 200);
    dependency, build, and VCS directories are skipped.

Exits 0 on no errors, 1 otherwise. Warnings do not fail validation.

## `doctrina index rebuild`

Regenerate `.doctrina/index.json` from the artifacts on disk.

```
doctrina index rebuild [--check]
```

The files are the source of truth; the index is a derived artifact.
The rebuild reads spec headers (`Status:`, `Version:`,
`Last updated:`), ADR headers, change proposals, archive folder
names, and skill frontmatter. Fields with no on-disk source —
project name, `framework_version`, product metadata — are carried
over from the existing index.

With `--check` the command writes nothing, prints a drift summary
per artifact category, and exits 1 when the index no longer
matches the tree. Wire it into CI next to `validate`.

## `doctrina next`

Print the recommended next workflow actions, in priority order.

```
doctrina next
```

Inspects the tree and reports: open changes (missing proposal,
unchecked tasks, deltas ready to apply, applied-but-unarchived),
ADRs still in `proposed` status, and index drift. When nothing is
open it says so and points at `change new` / `spec new`.

Read-only; always exits 0. Intended for agents and humans resuming
work without re-reading the whole tree.

## `doctrina metrics`

Derive adoption metrics from **local git history**. No network
calls; nothing leaves the repository.

```
doctrina metrics [--since <days|date>] [--save]
```

| Flag | Default | Purpose |
|------|---------|---------|
| `--since <n\|date>` | `90` | Window: a day count or any git-parseable date (`2026-01-01`, `"3 months ago"`). |
| `--save` | off | Write `.doctrina/metrics/YYYY-MM-DD.json` and print deltas against the most recent prior snapshot. |

Reports commit count, revert count and rate, Conventional-Commit
`fix` share, top-churn files, and a 21-day re-edit rate — the share
of commits touching a file edited in the prior 21 days. The re-edit
rate is a *proxy* for rework: iterative work also counts, so
compare trends between snapshots rather than absolute values.

This is the tooling half of the empirical A/B protocol in
[validation.md](validation.md): snapshot before adopting Doctrina,
snapshot monthly after, compare.

## `doctrina context [<capability>]`

Print the exact context pack for a task, in the documented read
order.

```
doctrina context billing
doctrina context billing --concat
```

The pack is: `AGENTS.md` → `.doctrina/product.md` → the capability
spec (when given) → open changes → ADRs with status `accepted` —
each with its line count, plus the total. Skills are listed
separately as name + description only: they are on-demand by
design, the body loads only when the task matches. The change
archive and non-accepted ADRs are excluded.

With `--concat` the command prints the file contents with path
separators instead of the list — ready to hand to an agent. This
is the read-order section of AGENTS.md turned into tooling:
selection over dumping. Read-only; always exits 0.

## `doctrina search <term> [...]`

Case-insensitive search across the artifact tree, grouped by
category.

```
doctrina search saml login
doctrina search quota --archive
```

Every term must match on the same line (AND). Categories: specs,
decisions, changes, skills, product, AGENTS.md. The change archive
is excluded unless `--archive` is passed. Exits 0 when matches are
found, 1 otherwise. Read-only — answers "where is X decided?"
without knowing the tree layout.

## Environment variables

| Variable | Effect |
|----------|--------|
| `NO_COLOR` | Disables ANSI colour in CLI output (per https://no-color.org). |
| `FORCE_COLOR=0` | Same as `NO_COLOR`. |
| `FORCE_COLOR` (any other value) | Forces colour even when stdout is not a TTY. |
