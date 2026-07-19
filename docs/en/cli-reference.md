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

On an interactive terminal, `init` also offers the adapter install as
a wizard step when `--agent` was not given (answer `none` to skip);
in pipes, CI, or under `--non-interactive` the prompt never fires.

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

The slug is truncated at a word boundary (never mid-token), and the
playbook closes with `doctrina close <id>` (the attested one-pass close)
after an explicit ADR checkpoint — "does this change decide something
structural? record it before closing."

With `--capability`, the change also gets a **scaffolded delta** at
`specs/<cap>/delta.md` with the `**Operation:**` header prefilled
(`MODIFIED` when the spec exists, `ADDED` when it does not) — the delta
was historically the only 100% hand-authored file in the flow, and a
missing header used to surface days later at the closing `analyze`.
Never scaffolded from a ranked guess; only from an explicit pin.

| Flag | Purpose |
|------|---------|
| `--title "<short>"` | Short display title: drives the slug and the proposal H1; the full prompt still lands under `## Why`. Without it a long prompt becomes a long H1. |
| `--capability <cap>` | Pin the capability instead of ranking matches, and scaffold a prefilled `delta.md` for it. |
| `--quiet` | Register the change and print one line — no playbook. For backlog entry ("record 19 works now, start none"); reprint later with `--resume <id>`. |
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

## `doctrina spec set <capability>`

Edit a spec's headers — and optionally one acceptance-criterion mark —
and resync the index in the same step, so the spec and `index.json`
can never drift apart (ADR 0007/0009). All requested ops apply
atomically: any error leaves the spec untouched.

```
doctrina spec set billing --implementation partial
doctrina spec set billing --bump minor --criterion "2:verified"
```

| Flag | Purpose |
|------|---------|
| `--implementation "<state>"` | Set the `Implementation:` header (`planned` → `partial` → `implemented` → `verified`). |
| `--status "<state>"` | Set the document `Status:` header (`draft` / `active` / `deprecated`). |
| `--bump major\|minor\|patch` | Bump the spec `Version:`. |
| `--version X.Y.Z` | Set the spec `Version:` explicitly. |
| `--criterion "<n>:<mark>"` | Set criterion *n*'s `[mark]`, e.g. `"2:verified"`. |

Stamps `Last updated:` and regenerates `.doctrina/index.json` from the
tree, echoing the **spec's** resulting version (not the CLI's — the two
looked identical in output and the ambiguity was a field-review
papercut). With no edit flag it exits 2.

## `doctrina change new <id> "<title>"`

Open a change proposal.

```
doctrina change new 0042-add-saml "Add SAML login"
```

Writes `.doctrina/changes/<id>/` populated with `proposal.md` and
`tasks.md`, plus an empty `specs/` directory ready for delta files
(`design.md` scaffolds only under `--design` — in practice it stayed
blank on every change that did not ask for one). Adds an entry to
`.doctrina/index.json` under `changes`.

The `<id>` is the directory name. Convention: `NNNN-slug`.

| Flag | Purpose |
|------|---------|
| `--chore`, `--no-spec` | Open a spec-less chore change (infra/docs/build) that still gets a proposal + ledger. |
| `--design` | Also scaffold `design.md` (opt-in). |
| `--force` | Overwrite an existing change folder. |

## `doctrina change apply <id...>`

Apply every spec delta found under `.doctrina/changes/<id>/specs/`.
Multiple ids run in sequence, each independently (batch close of a
backlog); the exit code is the worst per-id result.

```
doctrina change apply 0042-add-saml
doctrina change apply 0042-add-saml 0043-rate-limit 0044-audit-log
```

Semantics:

- **ADDED:** writes the full delta body to the target spec. A target that
  is still the **untouched `spec new` scaffold is replaced** — that is the
  canonical new-capability flow (`spec new` → write the ADDED delta →
  apply). Only a target with real content refuses (use MODIFIED, or
  REMOVE it first).
- **REMOVED:** deletes the target spec.
- **MODIFIED with an ` ```ops ` block:** applied mechanically — all ops
  or none (ADR 0007). The verbs cover headers (`set-header` /
  `bump-version`), acceptance criteria (`set-criterion` /
  `replace-criterion` / `append-criterion`), and the EARS requirement
  bullets (`append-requirement <section>: <text>` /
  `replace-requirement <section> <n>: <text>`, sections
  `ubiquitous|event|state|unwanted|optional`), so a typical delta
  applies end to end without a manual merge. `append-*` ops resolve
  numbering/position at apply time, so concurrent open changes
  appending to the same spec never collide. The syntax lives in the
  delta template and the work playbook.
- **MODIFIED without one:** prints `manual[MODIFIED]` with a pointer;
  you merge the prose by hand (free-prose rewriting — Purpose,
  Maturity — is the only case left).

When every delta processed successfully (no errors and no manual merges)
and at least one delta was written, the proposal's `Status:` header flips
from `proposed` to `applied` and an `Applied:` line is added. A change
whose merges stayed manual gets the stamp at `change archive` time
instead, so the file never contradicts the ledger.

## `doctrina change archive <id...>`

Move an applied change to
`.doctrina/changes/archive/YYYY-MM-DD-<id>/` and update the index.
Multiple ids run in sequence; the exit code is the worst per-id result.

```
doctrina change archive 0042-add-saml
doctrina change archive 0042-add-saml 0043-rate-limit
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

## `doctrina change check <id...>`

Pre-close dry-run — everything `close` would refuse, listed **before**
any of it runs, with the remediation next to each finding. Read-only;
the per-change `doctor`.

```
doctrina change check 0042-add-saml
```

Three passes plus an advisory:

1. **structure** — the same checks `analyze` runs (proposal, tasks,
   delta headers, targets).
2. **ops dry-run** — every MODIFIED delta's ` ```ops ` block executed in
   memory against its target spec: an op that would fail at apply time
   (missing header, no such criterion or requirement, unknown verb) is
   reported here, not at close time. A delta with no ops block is
   flagged as a manual merge so the close is planned around it.
3. **archive gate** — the unchecked boxes `archive` will refuse, with
   the bulk fix (`change tick <id> --all`) named.

Advisory (never gates): the accepted ADRs whose text cites the change's
touched capabilities — if the change alters what an ADR decided, amend
it (`decision supersede` / `decision new`) instead of drifting past it.

Exits 0 with `ready to close` when all three areas are clear. Accepts
multiple ids.

## `doctrina change tick <id> [n... | --all]`

List — and check off in bulk — the unchecked boxes of a change: every
`- [ ]` in `tasks.md` plus the proposal's `## Verification` section, in
one continuous ordinal space.

```
doctrina change tick 0042-add-saml            # list with ordinals
doctrina change tick 0042-add-saml 1 3        # tick boxes 1 and 3
doctrina change tick 0042-add-saml --all      # tick everything
```

Marking a checkbox was the one step with no command at all — batch
closes meant sed/Python by hand. Ticking is a *claim* of completion;
the honest gates are still `verify`/`coverage`/`archive` — this only
removes the mechanical friction.

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

## `doctrina change abandon <id>`

Discard an open change cleanly — the inverse of `change new`.

```
doctrina change abandon 0042-add-saml --reason "superseded by 0043"
```

Deletes the open change folder and its `index.json` entry, appends a
one-line abandonment record to `.doctrina/changes/archive/LEDGER.md`
(history keeps the trace even for work that went nowhere), and
rebuilds the index from the tree.

| Flag | Purpose |
|------|---------|
| `--reason "<text>"` | Record why the change was abandoned in the ledger line. |

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

## `doctrina decision land <number> [path ...]`

Record that an accepted ADR is now implemented, without mutating the
decision.

```
doctrina decision land 0007 src/ledger.js test/ledger.test.js
```

Stamps only the `Landed:` header with today's date plus any cited
proof paths; the decision body stays immutable. This satisfies the
accepted-ADR evidence check in `validate` (and the `doctrina next`
nudge) without superseding the ADR. Refuses to land an ADR that is
not `accepted`.

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
Candidates are deduplicated against existing skills — by exact slug, by an
existing skill whose body cites the candidate's change id / commit, and by
token-overlap slug similarity (a lesson captured under a *different* name no
longer resurfaces as a "new" candidate). The archive wins a collision. With
`--write` it scaffolds a stub per candidate, pre-seeded from its source, and
indexes it — so authoring a skill is "fill in", not "start from blank".
`--since <ref>` scans commits in `<ref>..HEAD` instead of the most recent
200; the git source degrades silently to archive-only when there is no
repo. Read-only without `--write`.

## `doctrina intent add "<text>"` / `list`

Post-intake intent evolution. Capabilities born after the intake —
brainstorms, pivots — used to end inevitably at `Realizes: n/a`, leaving
`trace` blind to the newest part of the system.

```
doctrina intent add "Risk map answers 'what should we test next?' in one read"
doctrina intent add "SC15: <text>"     # pin an explicit id
doctrina intent list
```

`add` appends a new anchor bullet (`- [SC5] <text>`) to product.md's
Success criteria, allocating the next number for the dominant prefix (or
pin one with the `SC15:` form). The follow-up is printed: declare
`**Realizes:** SC5` on the spec that delivers it, and `doctrina trace`
closes the loop. `list` prints every anchor in document order. The CLI
allocates and appends; the intent's wording is yours, verbatim (ADR 0005).

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

**Language-aware.** `--lang pt|en` forces the lexicon; otherwise the
project language declared in `.doctrina/config.json`
(`{ "language": "pt-BR" }`) decides, else a per-file stopword count.
Portuguese mode swaps the lexicon: `talvez`, `provavelmente`, `vários`,
`alguns`, … are the smells, while the English false positives disappear
(`some` is the verb *sumir*; bare `TODO` is the pronoun *todo* — only
`TODO:` is a marker). The flag matters on mixed-language files, where
the heuristic can tip the wrong way. A line carrying
`<!-- clarify:ok -->` is author-accepted and never flagged — the escape
hatch for a false positive the lexicon cannot know about.

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
schema field that is missing — including whether the AGENTS.md
**doctrina:surface block** (the CLI-owned, marker-delimited command
catalog generated from the installed CLI; ADR 0015) is present and
current. Read-only; never modifies any files. Exits 0 when every
recommended section is present, 1 otherwise.

Distinct from `validate`: `validate` answers "is this a
well-formed Doctrina tree?"; `templates check` answers "does
this tree still follow the shape the current CLI's templates
recommend?" Run it after `npm install -g doctrina-cli@latest` to see
whether new template shapes added sections your existing files
have not yet adopted.

## `doctrina templates update`

Fixer for what `templates check` reports.

```
doctrina templates update [--write]
```

Preview is the default: the command prints the update plan —
recommended sections missing from `AGENTS.md` and
`.doctrina/product.md`, missing `index.json` schema fields or
artifact categories, and the state of the AGENTS.md
**doctrina:surface block** — writes nothing, and exits 1 while
updates are pending. With `--write` it appends stub sections (marked
`<!-- added by doctrina templates update — fill in -->`), adds the
missing fields, and **regenerates the surface block** from the
installed command catalog: a stale block is rewritten in place; a
legacy hand-written `## Doctrina command surface` section (scaffolded
by an older CLI, no markers) is replaced by the managed block; a file
with neither gets the block appended. The marker-delimited span is
the one CLI-owned region (ADR 0015) — everything outside it is never
rewritten or removed, and filling in the stubs stays a human
decision.

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
26. Bilingual docs parity: in a project holding both `docs/en/` and
    `docs/pt/`, a Markdown file present in one language tree and missing
    from the other warns, in both directions (projects without both
    trees never see this check).
27. Project rules (`.doctrina/rules.json`): permanent, lintable
    constraints — each rule is a forbid-regex over glob-scoped paths, and
    a match is an **error** carrying the rule's own message. The place
    for instructions like "white-label: never name company X", which
    otherwise live only in agent memory and expire with the session:

    ```
    { "rules": [ { "id": "white-label", "forbid": "\\bAcmeCorp\\b",
                   "paths": ["src/**", ".doctrina/specs/**"],
                   "message": "white-label product; use a generic placeholder" } ] }
    ```

The `--fix` flag regenerates `index.json` from the tree before checking,
so a drifted index is repaired (and the `framework_version` stamp
migrated) rather than reported — the shipped pre-commit hook runs this.
`--json` emits `{ ok, errors, warnings }` for agents and CI pipelines.

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
cited. A spec that declares a deliberate deferral — `Implementation:
planned — <why>`, the same escape hatch `validate` honours — has its
unproven criteria reported as **deferred**: visible, never a `--strict`
failure (declared debt is not hidden debt). Read-only without `--run`.

| Flag | Purpose |
|------|---------|
| `--strict` | Exit 1 when any criterion is bare, dangling, or conditional (CI gate). Deferred never fails. Without it, the command always exits 0 (a report). |
| `--only <cap,cap>` | Scope the report/gate to specific capabilities (`doctrina close` uses this so an unrelated deferred spec cannot block a change's close). |
| `--run` | Execute the cited evidence via the project-declared `"evidence_runner"` in `.doctrina/verify.json` (a command template with a `{file}` placeholder, e.g. `"python -m pytest {file}"`). Exits 1 when any run fails — promotes "the file exists" to "the proof passes". |
| `--json` | Emit per-spec criterion rows + summary as JSON. |

## `doctrina trace`

Report intent provenance: which `product.md` success-criteria anchors
(`- [SC1] ...`) are realized by which capability specs (ADR 0006).

```
doctrina trace
doctrina trace --strict
```

Maps every anchor to the specs whose `**Realizes:**` header names it,
and reports the three provenance breaks: **dropped intent** (an anchor
no spec realizes), **dangling realizes** (a spec citing an anchor that
does not exist), and **untraceable** active specs (no `Realizes:`
header at all — a deliberate `n/a — <why>` is fine). Read-only.

| Flag | Purpose |
|------|---------|
| `--strict` | Exit 1 when any provenance break exists (CI gate). Without it, the command always exits 0 (a report). |
| `--json` | Emit anchors/dangling/untraceable + summary as JSON. |

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
work without re-reading the whole tree. `--json` emits `{ actions }`
for pipelines.

## `doctrina status`

One-glance project health dashboard (ADR 0012).

```
doctrina status
```

Prints the gate signals (index drift, framework stamp, coverage %, trace
anchors, whether verify is configured) and the artifact counts (specs by
implementation state, open changes, decisions, skills). Read-only; always
exits 0. It is a fast summary, not the authoritative gate — `doctrina
validate` / `verify` are. A natural session-start command for the agent
(`doctrina prime` is the richer session primer).

| Flag | Purpose |
|------|---------|
| `--json` | Emit the snapshot as JSON (stable shape for agents and CI). |

## `doctrina close <id...>`

Run the whole closing sequence for a change in one pass (ADR 0012).

```
doctrina close 0001-add-login
doctrina close 0001-add-login --force
doctrina close 0001-add-login 0002-rate-limit 0003-audit
```

Drives analyze → **ADR checkpoint** (advisory: the accepted ADRs whose
text cites the touched capabilities, with the amend commands — the
playbook's "record an ADR" step used to be skippable in silence) →
`change apply` → verify → `coverage --strict` → trace →
`change archive` → validate → **skill suggest** (advisory: fix-shaped
lessons not yet captured, surfaced while they are fresh), stopping at
the first failure with the exact command to rerun. The coverage gate is
**scoped to the capabilities the change's deltas touch** (`--only`
under the hood), so a deliberately deferred spec elsewhere in the tree
cannot block an unrelated close; a change with no deltas gates on the
whole tree. verify is skipped (with a note) when no `verify.json` is
declared; trace and both advisories never block. A driver over the
existing commands — it adds no checks of its own — so the agent makes
one call instead of nine.

Multiple ids close in sequence, each independently; the exit code is
the worst per-id result. Preview what close would refuse with
`doctrina change check <id>`.

| Flag | Purpose |
|------|---------|
| `--force` | Pass through to `change archive` (archive even if verification is incomplete; records the gap). |

## `doctrina why <capability>`

Explain a capability's provenance chain (ADR 0012).

```
doctrina why event-sourcing
doctrina why SC1
```

Forward (a capability name): assembles into one read the product intent
it `Realizes:` (the `[SC1]` anchors with their product.md text), the
capability's purpose and status, the acceptance criteria that prove it
(with cited evidence, read across continuation lines), the accepted ADRs
that name it, and a History section listing the archived changes that
built it (from the index ledger).

Reverse (an anchor like `SC1`): the anchor's product.md text, the
capabilities that realize it — each with status, implementation state,
and proof ratio — and the archived changes behind them. Answers "who
delivers this promise?".

Read-only in both directions.

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

Every file carries a token estimate (chars/4) and the pack reports
its total — the context-engineering thesis made measurable.

| Flag | Purpose |
|------|---------|
| `--concat` | Print the file contents with path separators instead of the list — ready to hand to an agent. The budget verdict (if any) goes to stderr, keeping stdout pure. |
| `--budget <n>` | Token budget for the pack: prints over/under and exits 1 when the estimate exceeds it (a context gate for scripts/CI). |
| `--diff <ref>` | Scope the stable artifacts (AGENTS.md, product.md, specs, ADRs) to those changed since the git ref; open changes are always included. The resume-session read. |

This is the read-order section of AGENTS.md turned into tooling:
selection over dumping. Read-only; exits 0 (or 1 when over `--budget`).

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

## `doctrina prime`

The session primer: the ~40-line read that orients an agent at the
start of a session.

```
doctrina prime
```

Prints, in one read: the gate digest (index state, coverage %, trace
anchors, verify checks), the artifact counts, the standing rules
(accepted ADR titles + non-goal count — `constitution` has the full
text), every open change with its task progress, and the top next
actions. It sits between `status` (numbers only) and
`context --concat` (everything): enough to act, cheap enough to run
every session. Read-only; always exits 0.

## `doctrina show <ref>`

Point-read one artifact fragment instead of a whole file.

```
doctrina show cli-R12     # requirement 12 of the cli spec (file order)
doctrina show cli-C3      # acceptance criterion 3 (the spec's numbering)
doctrina show 0007        # ADR 0007 (the whole decision)
doctrina show cli         # the spec's header block + Purpose only
```

An agent that needs one requirement should not re-read a 400-line
spec. `R` references are positional (they shift when a requirement is
inserted above — cite them for point reads and conversation, not as
immutable identifiers); `C` references use the criteria's own
explicit numbers. Read-only.

## `doctrina handoff`

Print a session handoff note in Markdown — what the next session (a
fresh agent, a teammate, tomorrow's you) needs to resume.

```
doctrina handoff
doctrina handoff > handoff.md
```

Contains: the gate digest, each open change with task-by-task
progress (unchecked items listed) and the exact resume command
(`doctrina work --resume <id>`), and the prioritised next actions.
Deliberately a **derived view, not a stored file** — the tree is the
truth and never goes stale; regenerate on demand. Read-only.

## `doctrina doctor`

Aggregate diagnostic: the one command to run when something looks
wrong and you do not know which gate to ask.

```
doctrina doctor
```

Sequences the existing checks — `validate` (machine-read), the index
drift check, the coverage/trace ratios, the clean-checkout lint
(`verify --clean`), the template-shape check, and the verify-config
presence — and reports each area as ok/warn/FAIL **with its exact
remediation command**. A driver over existing commands (like
`close`): it adds no checks of its own, so it can never disagree with
the gates it fronts. Read-only. Exits 1 when any area fails.

## `doctrina report`

Markdown digest for a period — the standup / PR-description view.

```
doctrina report
doctrina report --since 30
```

| Flag | Default | Purpose |
|------|---------|---------|
| `--since <days>` | `7` | Window size in days. |

Sections: gate state, changes archived in the window (from the index
ledger), open work with task progress, artifact counts, and a
local-git summary (commits, fix share, top-churn files). Read-only;
no network. `doctrina metrics` has the deeper git-derived numbers.

## `doctrina completion <bash|zsh|pwsh>`

Print a shell-completion script, generated from the same operation
catalog that feeds `--help` — the completion can never know a
different surface than the CLI ships.

```
doctrina completion bash >> ~/.bashrc
doctrina completion zsh  > "${fpath[1]}/_doctrina"
doctrina completion pwsh >> $PROFILE
```

Completes commands and their subcommands (flags are not completed).
Static output — regenerate after upgrading the CLI.

## `doctrina upgrade`

Bring an existing project up to the installed CLI after an npm update.
The project keeps the scaffold of the version that init-ed it — stale
framework stamp, an AGENTS.md that predates new commands, missing
recommended sections — and no other command closed that gap.

```
doctrina upgrade            # preview (exits 1 when steps are pending)
doctrina upgrade --write    # apply
```

An orchestrator over the pieces that already exist, in order:

1. `templates update` — **regenerate the AGENTS.md doctrina:surface
   block** from the installed command catalog (the block is CLI-owned,
   ADR 0015 — this is how agents reading the hub discover commands
   added since init; a legacy hand-written surface section is replaced
   by the managed block), and append missing recommended sections /
   index.json fields (additive-only outside the block).
2. `index rebuild` — regenerate index.json from the tree and migrate the
   `framework_version` stamp to the running CLI.
3. `validate` (`--fix` under `--write`) — surface anything the upgrade
   cannot fix (hand-authored drift, new validate checks).

## Environment variables

| Variable | Effect |
|----------|--------|
| `NO_COLOR` | Disables ANSI colour in CLI output (per https://no-color.org). |
| `FORCE_COLOR=0` | Same as `NO_COLOR`. |
| `FORCE_COLOR` (any other value) | Forces colour even when stdout is not a TTY. |
