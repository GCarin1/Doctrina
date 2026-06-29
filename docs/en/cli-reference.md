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
tasks → implement → analyze → apply → verify (`verify`/`coverage`) →
archive → validate. No natural-language interpretation happens in the
CLI (see ADR 0005).

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

A capability spec carries two independent axes: the document `Status:`
(`draft` → `active` → `deprecated`) and the `Implementation:` state
(`planned` → `partial` → `implemented` → `verified`). A fresh scaffold
is an honest `draft`/`planned`; promote `Status` to active once it
reflects intent, and advance `Implementation` as code lands. `validate`
warns when an `active` spec is still `planned` with no note — an
inventory claim with nothing built behind it.

The scaffold also carries a `**Realizes:**` header (ADR 0011): name the
`product.md` success-criteria anchors (`[SC1]`) this capability delivers,
or record `n/a — <why>` for an internal capability. Provenance is opt-out
— `validate` warns when an `active` spec on the implementation axis
declares no `Realizes:` header, and `doctrina trace` reports the
intent→capability link.

| Flag | Purpose |
|------|---------|
| `--bug` | Scaffold the bug-shape template (current / expected / unchanged behaviour) instead of the EARS capability spec. |
| `--force` | Overwrite an existing spec file. |

## `doctrina spec list`

One line per capability spec: id, version, document status,
implementation state, line count, and last-updated date, read from the
spec headers.

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

Archiving is the act of declaring a change finished, so it enforces
verification: the CLI **refuses** (exit 1) while any checkbox in
`tasks.md` (the closing steps included) or in the proposal's
`## Verification` section is still unchecked. Finish and check the
items, or pass `--force` to archive anyway — which prints the unmet
items and records the gap. This is the difference between "boxes
marked" and "verification passed".

| Flag | Purpose |
|------|---------|
| `--force` | Archive even though verification is incomplete (records the gap). |

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

## `doctrina skill suggest`

Surface fix-shaped lessons whose skill is not yet captured — the textbook
case for a skill (ADR 0012). It scans two deterministic sources: archived
change proposals and fix-shaped commits in the git history (ADR 0013). Skills
are written by humans; this only points.

```
doctrina skill suggest
doctrina skill suggest --write
doctrina skill suggest --since v0.7.0
```

Lists candidate slugs — derived from fix-shaped archived change ids, or from
fix-shaped commit subjects (`fix:`, `fix(scope):`, `bug:`, …; never
`feat:`/`refactor:`) — each with its lesson (the change's `## Why`, or the
commit subject) and its origin (`from <archive>` or `from commit <sha>`).
Candidates are deduplicated by slug against existing skills, with the archive
winning a collision. With `--write` it scaffolds a stub per candidate,
pre-seeded from its source, and indexes it — so authoring a skill is "fill
in", not "start from blank". `--since <ref>` scans commits in `<ref>..HEAD`
instead of the most recent 200; the git source degrades silently to
archive-only when there is no repo. Read-only without `--write`.

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

The hook runs `doctrina validate --fix`: it regenerates
`index.json` from the tree (healing the most common gate failure —
a hand-edited header that drifted the index — and re-staging the
repaired index) and still blocks the commit on errors a rebuild
cannot heal. The CLI refuses to run outside a git repository and
refuses to overwrite an existing hook unless `--force` is supplied.
The installed hook is a short POSIX shell script; edit it freely
after install (the CLI will not overwrite without `--force`), e.g.
swap the line for a bare `doctrina validate` to gate without
auto-repairing (CI-style, fail on any drift).

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
19. Two-axis honesty: a capability spec that is `Status: active` with
    `Implementation: planned` and no explanatory note warns (an active
    spec with nothing built behind it).
20. ADR evidence: an accepted ADR that adopts the `Evidence:` header but
    cites a path missing on disk warns (decision drift), and an accepted
    ADR whose evidence is the bare placeholder warns (cite it, or note
    `n/a — <why>`).
21. Archive ledger ↔ index: when `changes/archive/LEDGER.md` exists,
    every archived change must appear in both it and
    `index.json.changes_archive`, or validation **fails** (error).
22. Contracts present on disk but absent from `index.json` warn
    (orphan detection), and every indexed contract path must exist.
23. Provenance adoption: a capability spec that is `Status: active` and
    on the implementation axis but declares no `Realizes:` header warns —
    it traces to no product intent (ADR 0011). Any value silences it,
    including a deliberate `n/a — <why>`.
24. AGENTS.md command-surface drift: a `doctrina <cmd>` reference to a
    command the CLI does not have warns (typo/removed), and — for an
    AGENTS.md that documents a command catalog and does not defer to
    `doctrina --help` — commands the CLI ships that the hub omits warn
    (the hub the agent reads first stays in sync with the real surface).
25. Self-certified acceptance criterion: a criterion marked `[verified]`
    that cites no proof path warns (honest gates, ADR 0008; evidence on a
    continuation line still counts, so there is no false positive).

The `--fix` flag regenerates `index.json` from the tree before checking,
so a drifted index is repaired (and the `framework_version` stamp
migrated) rather than reported — the shipped pre-commit hook runs this.

Exits 0 on no errors, 1 otherwise. Warnings do not fail validation.

## `doctrina coverage`

Report how many acceptance criteria across `.doctrina/specs/` cite an
artifact or test that exists on disk — the traceability `validate` does
not check.

```
doctrina coverage
doctrina coverage --strict
```

Each numbered criterion may cite its evidence as a backtick path span,
e.g. `1. Returns 429 above the quota — verified by \`test/quota.test.ts\`.`
A criterion is **covered** when at least one cited path resolves,
**dangling** when a cited path is missing, and **bare** when nothing is
cited. Read-only.

| Flag | Purpose |
|------|---------|
| `--strict` | Exit 1 when any criterion is bare or dangling (CI gate). Without it, the command always exits 0 (a report). |

## `doctrina review`

Deterministic conformance review of your changes against the spec / ADR /
contract tree (ADR 0012). Reviews the working tree by default, or a diff
against a git ref with `--diff <ref>`.

```
doctrina review
doctrina review --diff main
doctrina review --strict
```

Reports structural breaks: code changed under a capability whose spec was
not updated, changed code mapping to no capability, acceptance criteria
citing missing proof, product intent realized by no spec, and contract
port/reference collisions. It checks conformance *shape* — whether the code
is faithful to the spec stays a human/LLM call (the ADR 0005 ceiling).
Read-only; exits 0 as a report, 1 under `--strict` when any hard break
exists. The agent self-reviews here before bringing work to the human.

## `doctrina verify`

Run the project-declared build/verify checks — the real "does the code
work" gate, distinct from the structural `validate` and never run by the
pre-commit hook.

```
doctrina verify
doctrina verify --init
doctrina verify --list
doctrina verify --signoff "chronicle=reads well, approved"
```

Checks live in `.doctrina/verify.json`. A check with `"type": "manual"` is
the qualitative gate (ADR 0012): judged by a human/eval and recorded as a
sign-off, not run as a command.

```
{
  "checks": [
    { "name": "typecheck", "run": "tsc --noEmit" },
    { "name": "test",      "run": "npm test" },
    { "name": "build",     "run": "npm run build" },
    { "name": "chronicle", "type": "manual", "rubric": "is the chronicle enjoyable to read?" }
  ]
}
```

Each `run` executes in order through the shell with output streamed;
`verify` exits non-zero if any command check fails. With no config it exits
1 and points at `--init`. A manual check passes once signed off and is
otherwise reported as *pending* — non-blocking by default, failing only
under `--strict`. Sign-offs live in `.doctrina/verify.signoffs.json`.

| Flag | Purpose |
|------|---------|
| `--init` | Scaffold a starter `.doctrina/verify.json` (refuses to overwrite without `--force`). |
| `--list` | Print the configured checks without running them. |
| `--clean` | Lint package.json files for reproducibility footguns instead of running checks. |
| `--strict` | Fail the gate when a manual check is still pending sign-off. |
| `--signoff "<name>=<note>"` | Record today's sign-off for a manual check, then exit. |
| `--force` | With `--init`, overwrite an existing config. |

## `doctrina contract new <name>` / `list` / `check`

Own the integration/runtime surface no single capability spec owns: the
port map, the environment contract, and API/WS/event interfaces.

```
doctrina contract new system
doctrina contract check
```

`contract new` scaffolds `.doctrina/contracts/<name>.md` (Ports,
Environment, Interfaces, References tables) and indexes it. `contract
check` verifies the mechanically checkable parts:

- **Port collisions** — two services claiming the same port is an error.
- **Environment drift** — a variable declared in the contract but absent
  from `.env.example` is a warning.
- **Referenced specs** — every `specs/<capability>` reference must exist
  (error otherwise).

Exits 1 on errors (port collisions, missing specs), 0 otherwise.

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
ADRs still in `proposed` status, accepted ADRs with nothing proving
them yet (suggesting `decision land`), a one-time skill-capture nudge
when no skill exists and an archived change is fix-shaped, and index
drift last (ADR 0011). When nothing is open it says so and points at
`change new` / `spec new`.

Read-only; always exits 0. Intended for agents and humans resuming
work without re-reading the whole tree.

## `doctrina status`

One-glance project health dashboard (ADR 0012).

```
doctrina status
```

Prints the gate signals (index drift, framework stamp, coverage %, trace
anchors, whether verify is configured) and the artifact counts (specs by
implementation state, open changes, decisions, skills). Read-only; always
exits 0. It is a fast summary, not the authoritative gate — `doctrina
validate` / `verify` are. A natural session-start command for the agent.

## `doctrina close <id>`

Run the whole closing sequence for a change in one pass (ADR 0012).

```
doctrina close 0001-add-login
doctrina close 0001-add-login --force
```

Drives analyze → `change apply` → verify → `coverage --strict` → trace →
`change archive` → validate, stopping at the first failure with the exact
command to rerun. verify is skipped (with a note) when no `verify.json` is
declared; trace is advisory. A driver over the existing commands — it adds
no checks of its own — so the agent makes one call instead of seven.

| Flag | Purpose |
|------|---------|
| `--force` | Pass through to `change archive` (archive even if verification is incomplete; records the gap). |

## `doctrina why <capability>`

Explain a capability's provenance chain (ADR 0012).

```
doctrina why event-sourcing
```

Assembles, into one read: the product intent it `Realizes:` (the `[SC1]`
anchors with their product.md text), the capability's purpose and status,
the acceptance criteria that prove it (with cited evidence, read across
continuation lines), the accepted ADRs that name it, and a History section
listing the archived changes that built it (from the index ledger).
Read-only. Answers "why was X built, and built this way?" without grepping
the tree by hand.

## `doctrina constitution`

Print the project's standing rules in one read.

```
doctrina constitution
```

Assembles, read-only: the accepted ADRs (the immutable decisions that govern
how the codebase evolves, oldest first) and the `## Non-goals` of
`product.md`. It is the Spec Kit `constitution.md` analogue — a single place
to see the non-negotiables — but it owns no facts of its own: to change a
principle, supersede the ADR; to change a non-goal, edit `product.md`.

## `doctrina watch`

Keep the project in sync and the agent oriented continuously (ADR 0012).

```
doctrina watch
doctrina watch --once
```

Watches the `.doctrina/` tree and, on every change, runs `validate --fix`
(heal drift, migrate the stamp) and reprints `doctrina next`. Debounced;
ignores the `index.json` the fix rewrites. Runs until interrupted (Ctrl-C);
`--once` runs a single pass and exits (the scriptable/testable form).

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
spec (when given — otherwise every active spec, so the current truth
is never absent) → open changes → ADRs with status `accepted` —
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
