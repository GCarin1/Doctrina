# CLI reference

Every command of the `doctrina` CLI, with flags and exit codes. Run
`doctrina <command> --help` for the same information at the terminal.

## Global flags

| Flag | Effect |
|------|--------|
| `--help`, `-h` | Print top-level usage, or per-command help if placed after a command. |
| `--version`, `-v` | Print the package version. |
| `--debug` | On an unexpected error, also print the stack trace. |

**Flag position does not matter.** Each command declares the flags it
accepts, and the CLI parses in two passes — first to resolve the command
name, then with that command's declared flags. So
`doctrina change new --chore my-id "Title"` and
`doctrina change new my-id "Title" --chore` are identical. A static test
asserts every flag a command reads, and every flag its `--help` documents
in the Options block, is declared — an undeclared flag used to swallow the
next argument as its value and report a misleading error.

**An undeclared flag is refused, never ignored.** The CLI exits 2 (USAGE),
names the flag, and suggests the declared one when it is a near miss.
Dropping it silently was worse than any parse error: on one tree
`doctrina coverage --strict` exited 1 while `doctrina coverage --stricts`
exited 0 — the gate the operator asked for never ran, and the run was
indistinguishable from success, so a CI job with a typo in `--strict`
stayed green over a tree the gate would reject. `--help` still prints,
even alongside a typo.

## Exit codes

A five-class contract (ADR 0018) — full detail in
[exit-codes.md](exit-codes.md).

| Code | Class | Meaning | What to do |
|------|-------|---------|------------|
| 0 | OK | Success (warnings allowed). | Continue. |
| 1 | GATE | A gate failed — the work is not ready. | Fix the work, retry. |
| 2 | USAGE | Unknown command, missing or malformed argument. | Correct the invocation. |
| 3 | PRECONDITION | The project is not set up for this yet. | Run the command named in the `hint:` line. |
| 4 | ENVIRONMENT | The environment cannot run this. | Stop. |

## Machine-readable output (`--json`)

Every command accepts `--json`. Paired with the [exit-code
contract](exit-codes.md), the two form the machine interface: structured
output plus a meaningful status, so an autonomous loop never parses English.

Every payload carries the same envelope:

| Field | Meaning |
|-------|---------|
| `$schema_version` | The payload contract version. Currently `1.0.0`. |
| `command` | The invocation this payload describes. |
| `ok` | `true` when the command succeeded. Derived from the code the command returns, so the payload and the process can never disagree. |
| `exit_code` | The process exit status — the class documented in [exit-codes.md](exit-codes.md). |
| `deprecated` | **Present only** when the invoked name is superseded: `{ use, since, why }` — the replacement command, the version from which the old name is legacy, and the reason. Branch on the key's presence. |

Two levels of support, stated rather than hidden:

- **Structured** — `validate`, `status`, `next`, `coverage`, `trace` build a
  payload describing their result, alongside the envelope fields.
- **Envelope** — every other command returns its human output as
  `stdout` / `stderr` string arrays inside the envelope, with ANSI stripped.
  Branch on `ok` and `exit_code`; the lines are there for completeness, not
  for parsing.

A command with nothing better to say is still machine-consumable, which is
what makes "`--json` on every command" a fact rather than an intention. More
commands gain structured payloads over time; the envelope fields never
change shape without a `$schema_version` bump.

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
| `--intake-text "<text>"` | none | The same thing inline, with no file to write first. Mutually exclusive with `--intake`; either written without a value is a usage error, never a project scaffolded without the intake you asked for. |
| `--date <YYYY-MM-DD>` | system date | Override the date written into artifacts. |
| `--force` | off | Re-scaffold a project that already exists. It re-writes only files that are still **pristine**: when `AGENTS.md` or `.doctrina/product.md` carries content you wrote, `init` refuses and names them (ADR 0016). |
| `--overwrite-content` | off | The explicit second opt-in that lets `--force` discard authored `AGENTS.md` / `product.md`. Without it, `--force` alone cannot destroy them. |
| `--non-interactive` | off | Fail instead of prompting for missing required values. |

`init` needs a description. On a terminal it asks; off one it **refuses**
(exit `2`) rather than accepting the empty string EOF returns — that used
to scaffold a project with a blank description and no warning. Pass
`--project-description` or `--intake`.

`init` refuses to run if `AGENTS.md` or `.doctrina/` already exist
unless `--force` is supplied.

**To add an agent to an existing project, use `doctrina adapter add
<name>`** — not `init --force`. `adapter add` is additive and never
touches `AGENTS.md` or `product.md`; `init --force` re-scaffolds and now
refuses when either carries authored content.

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
| `--force` | Overwrite an existing `.doctrina/intake.md` that is still `pending`. A **converted** intake is never reopened — `--force` refuses with exit `3` and points at `doctrina intent add` (new intent) and `doctrina work` (a change of behaviour). |

The positional takes either. A value that cannot be a path — a sentence,
with spaces and no separator or document extension — is read as the
description itself, and the CLI says so once on stderr; `--text` is the
explicit form. Anything that could be a path is treated as one, so a real
file is never mistaken for prose, and a path that does not exist is still an
error. `doctrina init --intake` follows the same rule, with `--intake-text`
as its explicit form.

The playbook steps: read the intake, fill every `product.md` section,
derive the capability list and run `spec new` + author EARS per
capability, record any forced ADRs, run `clarify --all` and `validate`,
then flip the intake header to `Status: converted`. After conversion
the specs are the only source of truth — the intake is never edited to
change requirements. Exits 1 when no source is given and no intake
exists.

## `doctrina triage ["<prompt>"]`

Classify a request **before** anything is scaffolded, and diagnose the
running system.

`work` used to be the answer to every request, so a broken workflow, an
empty env value and a suite that ran nothing all became changes with a
proposal, tasks and a spec delta — half an hour of ceremony for a bug the
YAML already explained, and a close that attested to a diagnosis. Three
lanes, because three kinds of request fail differently:

| Lane | What it means | Where it goes |
|------|---------------|---------------|
| `PRODUCT` | behaviour changes; the spec delta is the point | `doctrina work` |
| `RUNTIME` | wired wrong, empty, or ran nothing; no delta to write | diagnose first |
| `CHORE` | implementation-only, already specified | `doctrina work --chore` |

```
doctrina triage "the CI job is green but 0 scenarios ran"
doctrina triage            # no prompt: just run the runtime checks
doctrina triage --env      # also check the local .env
```

The classifier is deterministic term matching and prints the signals it
matched — a hint, like the capability guess in `work` (ADR 0005). It
never refuses. `work` consults it and **holds** a confidently
runtime-shaped prompt with exit 3 (a precondition, not a bad prompt);
`--force` opens the change anyway.

With or without a prompt, `triage` also runs the runtime checks over
every contract — the same checks and the same verdict as `contract
check`: declared wiring against the workflow, empty-vs-unset consumer
defaults, declared enums, and selectors that would match nothing.

| Flag | Purpose |
|------|---------|
| `--env` | Also check the local `.env` against the declared enums. Reports **names and membership only** — a rejected value is never printed, so the output is safe to paste. |
| `--json` | Emit `{ lane, confident, contracts, declared, findings, errors }`. |

Exits 0 when no runtime errors (warnings allowed), 1 when any error stands.

The classifier reads Portuguese as well as English: the prompt is folded
(accents stripped, lower-cased) and every signal list carries both
vocabularies, so "o build está quebrado no CI, a variável nunca chega ao
processo" is held as RUNTIME exactly like its English twin. `clarify`
does the same when the language is detected per file: a bilingual
document is scanned with both lexicons.

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

The change also gets a **scaffolded delta** at `specs/<cap>/delta.md`
with the `**Operation:**` header prefilled (`MODIFIED` when the spec
exists, `ADDED` when it does not) — the delta was historically the only
100% hand-authored file in the flow, and a missing header used to
surface days later at the closing `analyze`. It is written whenever the
CLI can name the capability: from `--capability`, or from the ranking
when the winner leads the runner-up by a real margin (one whole matched
term, which the length tie-breaker alone can never produce). A ranked
delta is always `MODIFIED` — the ranker only sees specs that exist — and
carries a comment saying it is a guess, naming the score it won on and
the one command that corrects it. Below the margin nothing is written:
a coin toss placed in a folder is worse than no file at all. The
prompt ranking scaffolds; `--from-diff` and `--chore` do not.

| Flag | Purpose |
|------|---------|
| `--title "<short>"` | Short display title: drives the id's slug and the proposal H1; the full prompt still lands under `## Why`. Without it the id is the prompt's first content words and the H1 keeps the prompt whole — short to type, whole to read. |
| `--capability <cap>` | Pin the capability instead of ranking matches. The delta is prefilled either way; pinning also drops the guess comment. |
| `--quiet` | Register the change and print one line — no playbook. For backlog entry ("record 19 works now, start none"); reprint later with `--resume <id>`. |
| `--id <id>` | Override the derived change id. |
| `--chore`, `--no-spec` | Open a spec-less chore change (infra/docs/build) whose playbook skips the spec-delta steps. |
| `--force` | Overwrite an existing change folder, and proceed past the lane hold below. |

Before anything is scaffolded, `work` consults the lane classifier (see
[`doctrina triage`](#doctrina-triage-prompt)). A prompt that confidently
reads as a **runtime** problem — a workflow, an env value, a run that
executed nothing — is **held** with exit 3 (a precondition: the work may
be fine, it simply has not been diagnosed) and pointed at `triage`, so no
ceremony is spent on a bug the YAML already explains. The classifier is
deterministic term matching and can be wrong: `--force` opens the change
anyway, and `--chore` is the lane for wiring the spec already covers.

## `doctrina spec new <capability>`

Create a new capability spec from the spec template.

```
doctrina spec new billing
doctrina spec new checkout-flow --bug
```

Writes `.doctrina/specs/<capability>/spec.md` and adds an entry to
`.doctrina/index.json`. Capability names — and contract and skill names,
which share the grammar — are lowercase letters, digits and hyphens,
start with a letter, carry no trailing or doubled hyphen, run at most 64
characters, and are never a Windows reserved device name (`con`, `prn`,
`aux`, `nul`, `com1`–`com9`, `lpt1`–`lpt9` — a directory git can neither
see nor remove there). The error names the rule that failed.

A capability spec carries two independent axes: the document `Status:`
(`draft` → `active` → `deprecated`) and the `Implementation:` state
(`planned` → `partial` → `implemented` → `verified`). A fresh scaffold
is an honest `draft`/`planned`; promote `Status` to active once it
reflects intent, and advance `Implementation` as code lands. `validate`
warns when an `active` spec is still `planned` with no note — an
inventory claim with nothing built behind it.

An acceptance criterion still in the scaffold's placeholder form — the
`<observable signal>` citing `path/to/test` that `spec new` writes — is
reported by `validate`, because its proof resolves nowhere and would
otherwise surface as a coverage failure in the close of whatever change
touches the capability next.

The scaffold also carries a `**Realizes:**` header (ADR 0011): name the
`product.md` success-criteria anchors (`[SC1]`) this capability delivers,
or record `n/a — <why>` for an internal capability. Provenance is opt-out
— `validate` warns when an `active` spec on the implementation axis
declares no `Realizes:` header, and `doctrina trace` reports the
intent→capability link. A header still carrying the scaffold's own
placeholder counts as no header: the escape hatch is deliberate, and it
has to be armed deliberately.

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
| `--implementation auto` | Set it to the state the **coverage arithmetic** supports: `verified` when every criterion cites resolving proof, `partial` when some do, `planned` when none does. Refuses a spec with no acceptance criteria rather than guessing, leaving it untouched. The same derivation `validate` warns from and `close` proposes as a `set-header` op — see [Gating](gating.md#the-header-you-do-not-maintain-implementation). |
| `--status "<state>"` | Set the document `Status:` header (`draft` / `active` / `deprecated`). |
| `--bump major\|minor\|patch` | Bump the spec `Version:`. |
| `--version X.Y.Z` | Set the spec `Version:` explicitly. |
| `--criterion "<n>:<mark>"` | Set criterion *n*'s `[mark]`, e.g. `"2:verified"`. |

Stamps `Last updated:` and regenerates `.doctrina/index.json` from the
tree, echoing the **spec's** resulting version (not the CLI's — the two
looked identical in output and the ambiguity was a field-review
papercut). With no edit flag it exits 2.

The two headers and the criterion mark have a **domain**, enforced at
every door: `Status` is `draft | active | deprecated`, `Implementation`
is the four-rung ladder above, and a criterion mark is `[verified]`,
`[unverified]` or `[orchestration]`. `spec set`, a delta's `ops` block
and `validate` read the same list, so `--status bogus` is refused with
the spec untouched, and a value typed by hand outside the list is a
`validate` error rather than a state `prime` reports. A note after the
word stays legal (`planned — deferred, see ADR 0007`): only the word is
checked.

## `doctrina change new <id> "<title>"`

Open a change proposal.

```
doctrina change new 0042-add-saml "Add SAML login"
```

The id names a directory, so it obeys a grammar: lowercase letters,
digits and hyphens, opening on a letter or a digit — the shape
`doctrina work` derives. Anything else is a usage error (exit 2) and
nothing is written. Without that rule `change new ../../../elsewhere/evil`
scaffolded a change **outside the project**, and an id like
`0003-with space` was accepted here and then carried by `validate`,
`index rebuild` and `next` as legitimate — producing a remediation line
that could not be run.


Writes `.doctrina/changes/<id>/` populated with `proposal.md` and
`tasks.md`. `design.md` scaffolds only under `--design` — in practice it
stayed blank on every change that did not ask for one — and the
`specs/<capability>/` directory appears when there is a delta to put in
it, never before: an empty one asserts that deltas live there when nothing
had written any. Adds an entry to
`.doctrina/index.json` under `changes`, **derived from the proposal on
disk** by the same constructor `index rebuild` uses — a field the deriver
knows about and a hand-assembled entry does not is index drift the moment
the change is opened, which is exactly what the `lane` field did. For the
same reason `work` registers the change only after it has finished writing
the proposal (lane and affected specs stamped), so the tree it leaves
passes `doctrina validate` without a rebuild.

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

**Gated on `structure`** (ADR 0017): `apply` refuses when `analyze` would
fail, and writes nothing. Preconditions attach to the transition, not to
the command driving it, so `apply` enforces exactly what the `close` path
enforces — an agent cannot reach through one path a state another path
forbids. `--force` waives the *check* and records the gap in the ledger;
it does not waive the operation, so a forced apply past a malformed delta
still fails when it tries to read it.

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

Archiving is the act of declaring a change finished, so it is **gated on
`verification`** (ADR 0017): the CLI **refuses** (exit 1) while any
checkbox in `tasks.md` (the closing steps included) or in the proposal's
`## Verification` section is still unchecked. It deliberately does not
re-run the `structure` gate — that gate asks "is this safe to apply?",
and after a successful apply its ADDED-target check would report the
proof of success as a conflict. Finish and check the
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
   delta headers, targets), including the hollow-change failure: tasks.md
   still carrying the scaffold's empty `- [ ]` placeholders means the
   change was opened but never planned.
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

A box with no text is a **scaffold placeholder** (the change was opened
but never planned): the listing marks it, and ticking it is refused —
write the real task (or delete the line) first. `analyze` and `close`
hard-fail on leftover placeholders, so a hollow change cannot close.

Every surface counts the same boxes. `prime`, `report`, `handoff` and
`next` report one progress number per change, placeholders included: an
unwritten task is a task nobody finished, and hiding it is what let
"tasks 0/3" mean six open boxes. `tick` adds the proposal's Verification
boxes to that, because they share its ordinal space, and names the file
each ordinal came from.

The ordinals are **stable**: they run over every box in reading order,
ticked or not, so `tick <id> 2` names the same box today and after box 1
is done. The listing shows each box's state; a box already ticked is a
named no-op; an argument that is not a number is refused by name. Any
Markdown bullet (`-`, `*`, `+`) opens a box, for `tick` and for the
archive gate alike.

## `doctrina change diff <id>` — deprecated

> **Deprecated.** Use `doctrina change check <id> --verbose`, which runs
> every ops block against the target spec *and* prints this same per-delta
> preview. The old name still works, warns on stderr, carries a `deprecated`
> field in its `--json` envelope, and will be removed in a later minor.

Preview every spec delta in a change before applying it.

```
doctrina change check 0042-add-saml --verbose   # preferred
doctrina change diff 0042-add-saml              # deprecated alias
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
checks the change's shape, this shows its content.

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
| `--force` | Skip the confirmation. **Required off a terminal** — abandoning deletes work with no undo, and the CLI will not take silence as consent. |

Without `--force`, `abandon` lists the files it would delete, states that
the deletion cannot be undone, and asks. On a non-interactive stdin there
is nobody to ask, so it refuses (exit `2`) rather than proceeding.

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
`Supersedes: 0007` in its frontmatter. Only an **accepted** ADR is
superseded: a proposed target is refused naming its state (a proposal that
fell is set to `rejected` or deleted), and a title that is only digits is
refused as the argument order swapped.

## `doctrina decision accept <number>`

Flip a `proposed` ADR to `accepted`.

```
doctrina decision accept 0007
```

**The ADR must say something first.** An accepted ADR is immutable,
becomes a standing rule in `prime --rules`, and loads into every pack it
governs — so accepting one whose `Context`, `Decision` or `Consequences`
is still the shipped template is refused, with the unwritten sections
named and nothing written to disk. A single line of real prose per section
is enough; the check is for the mould, not for length.

Rewrites only the `Status:` header — the body stays immutable — and
re-derives the whole index entry from the file, so the summary and scope
you wrote between `new` and `accept` are the ones recorded. Any other
current status (already accepted, superseded, withdrawn) is a clear error
with no writes. Closes the lifecycle that `decision new` opens; `doctrina
next` points here when an ADR is stuck in `proposed`.

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

## `doctrina decision scope [<number>]`

Show which capabilities each ADR governs, and propose one for
every unscoped ADR.

```
doctrina decision scope
doctrina decision scope 0007
doctrina decision scope --write
```

An ADR with no `- **Scope:**` header is **global**: it loads into
every context pack, forever, because ADRs are immutable and never
retire. That is what makes a default read pack grow with the
project's age rather than with the task (ADR 0022). Scoping is the
fix — but only if it gets adopted, and nobody hand-annotates forty
immutable documents.

So the scope is proposed from evidence the tree already holds. The
archived change that cites an ADR records which specs it touched
(`changes_archive[].specs_affected`), and that is the strongest
signal available: it is what actually moved. When no archived
change cites the ADR, its own text is scanned for capability ids
and the suggestion is labelled `text — confirm before writing`,
because capability ids are ordinary words and a scope of
"everything" is the same as no scope at all.

| Flag | Purpose |
|------|---------|
| `--write` | Apply the suggestions, inserting `- **Scope:**` after each ADR's `Status:` header. Without it, the command only reports. |

Review what it writes. A scope that is too narrow hides a decision
from the pack that needed it, and nothing detects that
automatically — the tool proposes, you decide. Leaving an ADR
global is a legitimate answer for decisions about the project's
stance rather than one capability. Run `doctrina index rebuild`
afterwards to surface the scopes in `index.json`.

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
`description:` field are reported and skipped, and a skill whose
description is still the template's `<…>` placeholder is named as
scaffold rather than mirrored. Never edits skill files. `doctrina
validate` warns when a description has drifted from the index.

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

### `--from-error <text|file>`

Both sources above fire *after the fact*: a skill is born when someone
remembers to write one, which is to say after the incident already cost a
session. The moment the lesson exists is the moment the error is on
screen — and that text carries exactly what a trigger needs.

```
doctrina skill suggest --from-error "$(cat failure.log)"
doctrina skill suggest --from-error ./failure.log --write
```

It drafts **one** skill from the failure, filling the `when:` trigger from
the error's own paths, ALL_CAPS identifiers, quoted fragments and
distinctive keywords — the field a human is least likely to write in a
matchable form, and the one `context` ranks on. The procedure stays yours
to write, while you still remember it. A generated trigger always
satisfies `validate`'s trigger check. Given without a value it is a usage
error (exit 2), never a silent fall-through to the ordinary scan.

## `doctrina adapter list` / `add` / `remove`

Add, remove, and inventory the per-agent adapter files that point at
`AGENTS.md` (ADR 0016).

```
doctrina adapter list
doctrina adapter add gemini
doctrina adapter remove gemini
```

Before this command, adding an adapter to an existing project meant
`doctrina init --agent <name> --force` — and that regenerated `AGENTS.md`
and `.doctrina/product.md` from blank templates, destroying hand-authored
rules and the product definition with no warning. `adapter add` is
**strictly additive**: it writes that adapter's own files and never reads
or writes `AGENTS.md`, `.doctrina/product.md`, or any other artifact.

`adapter list` reports three states, because "no adapter installed" and
"no adapter needed" used to be indistinguishable:

| State | Meaning |
|-------|---------|
| `installed` | The adapter's files are present in this project. |
| `available` | It ships files and none are installed. |
| `native` | The agent reads `AGENTS.md` directly and needs no file at all (`amp`, `codex`, `devin`, `factory`, `jules`). |

`adapter remove` deletes only the files that adapter created. A file you
edited after install is yours — it is kept, and named, unless `--force`.
It also unmakes the directories `add` made: once its last file is gone, an
**empty** `.claude/commands/` and `.claude/` are pruned too, walking up and
stopping at the first directory that still holds anything. An empty
`.claude/` is not an absence — it is a configuration root the next agent
finds and treats as present. A directory holding a kept file, or anything
of yours, survives untouched.

**Custom adapters.** A directory at `.doctrina/templates/adapters/<name>/`
is installable by name and takes precedence over a bundled adapter of the
same name. Templates there use the same tokens as the bundled ones; the
`AGENTS_MD_PATH` token resolves to the correct relative path for the file's
depth, so a nested command file points at `../../AGENTS.md` on its own.

| Flag | Purpose |
|------|---------|
| `--force` | With `add`, overwrite an existing file; with `remove`, delete a file that was edited after install. |

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
- `tasks.md` free of **scaffold placeholders** — an empty `- [ ]` left
  from the scaffold (checked or not) is a hard failure: the change was
  opened but never planned, and implementing on a hollow change is the
  failure mode this blocks (`validate` warns about it on every run;
  `change tick` refuses to tick an empty box).
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

Two exclusions are structural rather than lexical, so they need no
annotation. A quantifier followed by a number (`many 8`) quantifies, and a
quantifier inside the interrogative `how many` is a **question**: a
requirement that says "shall report how many contracts declared no rows"
names exactly the number the command must print. And a rule reads the tail
of the previous line as context, reporting only matches that begin on the
line being scanned — prose wraps, and the same sentence must not get two
verdicts depending on where the paragraph happened to fold. The escape
hatch is for what the lexicon cannot know; a structural false positive is
a bug in the rule, and annotating it pays the price of the bug instead.

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
current. It also verifies every installed **hub pointer** still references
`AGENTS.md`. A hub pointer is an adapter file whose template declares the
`{{AGENTS_MD_PATH}}` token — `CLAUDE.md`, `GEMINI.md`,
`.cursor/rules/00-doctrina.mdc`, and so on. Those are the files that route
an agent at the hub, which is why one surface-block refresh reaches every
installed agent. Slash-command shims (`.claude/commands/doctrina-*.md`)
are **not** pointers: they invoke the CLI and reach the hub through their
parent pointer file, so requiring them to name `AGENTS.md` was a false
failure on every clean install.

Every finding names the command that resolves it, or says plainly that
repair is manual. A test executes each printed remedy and asserts the
finding clears — a remedy the CLI cannot execute and verify is not a
remedy. Read-only; never modifies any files. Exits 0 when every
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

**The section recommendation states what it costs.** `AGENTS.md` has a
declared line ceiling (`agents-md-lines`), and it is an OUTPUT budget, so
`analyze` refuses a change that resolves an overflow by raising it. When the
missing stubs would not fit, `templates check` names the price and the cut
to make first, and `templates update --write` **holds** that item — it
prints what it declined and why, leaves the file untouched, and applies its
other updates normally. Making the room it asks for and re-running clears
the hold. Without that, one advisory gate resolved its own finding by
walking into another gate's refusal, silently.

## `doctrina hooks install`

Install the Doctrina pre-commit hook into `.git/hooks/pre-commit`.

```
doctrina hooks install [--force]
```

The hook pins the CLI that installed it — `.git/hooks/` is local to the
clone, so it names that CLI's entrypoint by absolute path and reads
`DOCTRINA=` from the environment as the override. A bare `doctrina` on the
PATH may be an older release, and an older release rebuilding the index
used to rewrite the `framework_version` stamp backwards on every commit.

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
4c. An **active** capability spec declares at least one acceptance
    criterion. A spec that states what the system must do and nothing
    about how anyone would know it does cannot be proven; `Status: draft`
    — what `spec new` scaffolds into — is the state for one still being
    drawn.
4b. Every artifact the framework owns — `product.md`, each spec, ADR,
    open proposal, contract and skill — carries content and opens with a
    title. Existence is not content: a zero-byte file exists, and the
    header-vs-index comparison runs on the headers it finds, so a file
    with none agrees with everything.
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
    it traces to no product intent (ADR 0011). Any value the author wrote
    silences it, including a deliberate `n/a — <why>`; the scaffold's own
    placeholder does not, or the check would be dead in the normal flow.
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

28. **Ordered pipeline requirements.** A spec may declare an optional
    `### Pipeline` block: numbered steps and the artifact each hands on.
    EARS states every event-driven requirement independently and says
    nothing about sequence, so "when the run finishes, append a summary"
    and "when the analysis completes, publish the dashboard" both pass
    while the dashboard renders an analysis that has not run yet. The
    invariant a numbered list cannot enforce on its own — a step may only
    require what an **earlier** step produced — becomes an error:

    ```
    ### Pipeline

    1. run-suite — produces `reports/results.json`
    2. analyse — requires `reports/results.json`, produces `reports/analysis.md`
    3. publish — requires `reports/analysis.md`
    ```

    `PL01` is out-of-order numbering, `PL02` a step requiring what a later
    step produces (it can only ever read the previous run's copy), `PL03`
    a requirement no step produces. Inputs from outside the pipeline are
    marked `(external)`. Opt-in: a spec without the block is never checked.
29. **Skill triggers.** A skill whose frontmatter `when:` names nothing
    concrete — no keyword, path, command or error string — warns. `context`
    ranks skills by matching a task against that trigger, so a trigger
    written as pure prose ("whenever it seems relevant") can never fire,
    and the skill is loaded only by someone who already knew it existed.

30. **Ghost references.** A spec's `Depends on:` naming a capability with
    no spec is an error (the pack, the graph and the review all read that
    header); an open change's `Affects specs:` naming one with no spec and
    no ADDED delta in the change warns; an intent anchor declared twice in
    `product.md` is an error, and `trace` names the duplicate.
31. **Scaffold placeholders in contracts and skills.** A contract still
    carrying `<NAME>` rows or `specs/<capability>` under References warns;
    a skill whose `description:` or `when:` is still the template's
    `<…>` form warns, and such a `when:` is never a detectable trigger.
32. **A spec off the path.** A loose `.md` in `.doctrina/specs/`, a
    capability directory without `spec.md`, or a second file there that
    opens like a spec warns with the canonical path — nothing outside
    `specs/<capability>/spec.md` is read.
33. **Unknown configuration keys.** A key in `config.json` the CLI does not
    know warns with the keys it accepts; the value is ignored, never
    silently.

The `framework_version` stamp is never rewound: an index written by a
newer CLI keeps its stamp under an older one (`--fix` and `index rebuild`
alike), `validate` names the gap as "upgrade the CLI", and `index rebuild
--check` does not count a stamp ahead as drift.

The `--fix` flag regenerates `index.json` from the tree before checking,
so a drifted index is repaired (and the `framework_version` stamp
migrated) rather than reported — the shipped pre-commit hook runs this.
`--runtime` additionally runs the runtime gate — the declared wiring,
enums and selectors checked against the workflows and code meant to
honour them (the same checks as `contract check`), so one call covers
both halves of the truth. It is opt-in because it reads files outside
`.doctrina/`. `--json` emits `{ ok, errors, warnings, strict }` for agents
and CI pipelines.

`--strict` counts warnings against the exit code, the way `coverage
--strict` and `trace --strict` already do. The default stays lenient on
purpose: a warning is advice, and advice that blocks a commit stops being
read. But a caller that must be able to *reprove* needs a verdict, not
advice — the CI step that validates the shipped examples ran plain
`validate`, both examples drifted to warnings, and the step reported green
for weeks while an EARS defect sat in the example that exists to teach
against it. Pass `--strict` wherever a warning is a defect.

Exits 0 on no errors, 1 otherwise. Warnings do not fail validation unless
`--strict` is given.

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

A project that declares no criterion at all has no ratio to report, so
coverage says so — *no criteria declared*, `pct: null` in `--json` — rather
than scoring 100% over nothing. `status`, `prime`, `report`, `handoff` and
`doctor` all render that same absence.

Two more things the arithmetic honours. **The author's mark**: a
criterion still marked `[unverified]` whose proof resolves is evidence
*linked*, not certified — the derived `Implementation` stops at
`implemented` until the mark is flipped (`spec set <cap> --criterion
<n>:verified`), and the report lists the criteria waiting. **Where proof
lives**: a cited path must be a file inside the project. A path that
resolves outside the root (`../other/app.py`, an absolute path) or to a
directory (`tests/`) is not evidence — it is reported as dangling with
the reason, while a directory named next to a real proof is a prose
mention and stays silent. A criterion that cites one path that resolves
and one that does not is covered, and the report names the one that
does not.

**Describing is not citing.** A criterion has two halves — the observable
signal, then the proof — and the grammar separates them with `verified
by` (`proven by`, `evidenced by`, `demonstrated by` and the Portuguese
`verificado por` count too). Only paths **after** that marker are read as
claims of evidence. A path named before it is the scenario the criterion
describes, not a second proof it offered:

```
1. [verified] A loose `specs/legacy.md` draws one warning
   — verified by `test/a-spec-off-the-path-is-named.test.js`.
```

`specs/legacy.md` exists only inside that test, and the report stays
quiet about it. Cite two paths after the marker and a broken one is still
named. A criterion with no marker keeps the older rule, where every cited
path is a claim — so a project not using this grammar loses nothing.

### Orchestration criteria

Citation is the right proof for "this function behaves" and the wrong one
for "the pipeline ran at all". A criterion like *"absence of the report is
explicit and the step does not fail"* is satisfied, on paper, by a job that
executed zero cases and printed a well-written empty state: the citation
resolves, the suite is not skipped, and coverage calls it proven.

Mark such a criterion `[orchestration]` and cite a **verify check** by
name instead of a file:

```
3. [orchestration] the e2e suite actually executes scenarios —
   verified by `verify:e2e`
```

That check must declare an `expect` guard (see
[`doctrina verify`](#doctrina-verify)). A cited check with no guard is
reported **unguarded** and fails `--strict`: a check that exits 0 having
run nothing would otherwise satisfy the claim. A named check that does not
exist is **dangling**.

| Flag | Purpose |
|------|---------|
| `--strict` | Exit 1 when any criterion is bare, dangling, conditional, or unguarded (CI gate). Deferred never fails. Without it, the command always exits 0 (a report). |
| `--only <cap,cap>` | Scope the report/gate to specific capabilities (`doctrina close` uses this so an unrelated deferred spec cannot block a change's close). A name with no spec is a **usage error** (exit 2), naming the capabilities that exist: a filter matching nothing used to report "no acceptance criteria found" and exit 0, `--strict` included, so a CI job kept passing once the capability was renamed. |
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

A capability counts as **opted in** only when its `Realizes:` header cites
an anchor id. The header alone is not participation: `spec new` scaffolds
one with a placeholder value, and a single scaffolded spec used to be
enough to leave the never-opted-in branch and land in the normal report,
where zero anchors rendered as `ok 0 of 0 intent anchors realized` — a
green verdict over nothing, on the first read a new project gets about
itself, while `doctor` warned about the same tree. With no anchors at all,
trace never reports satisfied: a ratio over zero states nothing true. A
project that has declared no provenance whatsoever is still not nagged —
the bootstrap is not blocked by a feature nobody opted into.

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

**A `--diff` ref must resolve.** One that does not is a usage error (exit
2), not an empty diff: it used to report "no changes" and exit 0 —
`--strict` included — on a tree where a valid ref reported breaks, so a CI
job running `doctrina review --diff main --strict` passed forever on a
shallow clone with no local `main`. (Git words a missing ref and a
repository with no commits identically, which is how the failed diff read as
an empty one.) Outside a git repository the gate still stays silent rather
than accusing.

Reports structural breaks: code changed under a capability whose spec was
not updated, changed code mapping to no capability, acceptance criteria
citing missing proof, product intent realized by no spec, and contract
port/reference collisions. It checks conformance *shape* — whether the code
is faithful to the spec stays a human/LLM call (the ADR 0005 ceiling).
Read-only; exits 0 as a report, 1 under `--strict` when any hard break
exists. The agent self-reviews here before bringing work to the human.

**Which capability a changed file belongs to is DECLARED, never inferred**
(ADR 0027). A capability spec claims its code in an optional `**Source:**`
header holding comma-separated globs — `*` inside a segment, `**` across
directories, `?` for one character, `{a,b}` alternating (nesting allowed,
and a brace with no matching close matches nothing, so a malformed pattern
is reported rather than quietly covering less) — the same dialect a
contract's Selectors use:

```
**Source:** `src/commands/{init,adapter}.js`, `docs/**`
```

A declared match outranks the fallback heuristics (the capability name as a
path segment, the spec citing the path or the basename), which stay for a
project that declares nothing — so a spec with no header behaves exactly as
before. Two gates keep the claim honest: `validate` warns when a pattern
matches no file, and `review` names the changed files that belong to no
capability **one by one**. That second half matters: the note used to fire
only when the whole diff matched nothing, so a single incidental hit —
anything under `docs/`, which matches the `docs` capability because the
directory is named after it — silenced it for every other file in the
change.

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
    { "name": "chronicle", "type": "manual", "rubric": "is the chronicle enjoyable to read?",
      "paths": ["src/chronicle/"] }
  ]
}
```

Each `run` executes in order through the shell with output streamed;
`verify` exits non-zero if any command check fails. With no config it exits
1 and points at `--init`. Sign-offs live in
`.doctrina/verify.signoffs.json`. Under `--json` every check is teed, so
the envelope's `stdout`/`stderr` carry what the checks printed — carriage
returns stripped — and standard output stays pure JSON.

### A manual sign-off expires

A signature is a statement about code at a moment. When that code moves,
the statement stops being evidence and becomes history — so a sign-off
records the commit it was made at, and the `paths` the check declares it
covers (**declared, never inferred**, like everything else in
`verify.json`). `verify` compares the two against the working tree and
reports one of four states:

| State | Meaning | Passes? |
|-------|---------|---------|
| **fresh** | signed, and nothing it covers has moved since | yes |
| **expired** | a covered path changed after the signature | no |
| **unverifiable** | no commit recorded, no `paths` declared, or not a git repository — so "has it moved?" has no answer | no |
| **pending** | never signed off | no |

Only *fresh* passes. The other three are **non-blocking by default and
fail under `--strict`** — the rule `pending` always followed, kept as one
rule rather than two. Both committed changes and uncommitted working-tree
edits count, because a signature is about the code as it stands.

A signature made before this existed carries no commit, so it is reported
as **unverifiable**: not trusted, and not called expired either, because
nobody knows that it is. One re-signature clears it, and `verify
--signoff` warns at signing time when a check declares no `paths` — an
unanchored signature is one nothing can hold to the code.

`status`, `prime`, `handoff`, `report` and `doctor` all distinguish
executed proof from signed proof, so a green total cannot hide how much of
it was a human's word.

### Output expectations — fail-closed on a run that did nothing

An exit code answers "did the runner crash", never "did the runner run
anything". A suite whose filter matched no cases prints `0 scenarios` and
exits 0, and every gate calls that a pass — a green job that tested
nothing. Add an `expect` block to make the run's own output part of the
verdict:

```
{
  "name": "e2e",
  "run": "behave --tags @smoke",
  "expect": {
    "fail_if_output_matches": "0 scenarios",
    "require_output_matches": "\d+ scenarios? passed"
  }
}
```

Doctrina supplies no patterns of its own and knows nothing about what the
output means — the project declares the line that proves its run was
real, so this works for any runner in any language. An expect-carrying
check still **streams**: its output is teed to the terminal as it arrives
while a copy accumulates for the match, so reading a check's output never
costs you the ability to watch it. An `expect` pattern that is not a valid
regular expression fails at **config time** with exit 2, never silently.

An `expect` guard is also what an `[orchestration]` acceptance criterion
cites as its proof — see [`doctrina coverage`](#doctrina-coverage).

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
Environment, **Wiring**, **Selectors**, **Budgets**, Interfaces,
References) and indexes it. `contract check` verifies the mechanically
checkable parts.

**Structure:**

- **Port collisions** — two services claiming the same port is an error.
- **Environment drift** — a variable declared in the contract but absent
  from `.env.example` is a warning.
- **Referenced specs** — every `specs/<capability>` reference must exist
  (error otherwise).

**Runtime** — the declaration held to the implementation. Doctrina learns
no CI system, test runner or language: every check below reads a glob,
pattern or origin the *contract* declares.

| Code | What fails |
|------|------------|
| `RT01` | A variable declared with origin `vars`/`secrets` that no `env:` block in the named workflow exports. The value exists in CI and never reaches the process — the whole "I set the secret and nothing happened" class. |
| `RT02` | The workflow reads it from a different origin, or under a different name, than the contract declares. Exporting under a different name is routine — npm reads its credential from `NODE_AUTH_TOKEN` whatever your secret is called — so declare the source in the Origin cell as `<origin>:<source>` (e.g. `secrets:NPM_TOKEN`). RT02 then stays silent while the two agree and warns the moment either side moves. A bare origin keeps warning on any rename, which is the right default. An **origin** mismatch stays an error either way: that one is never intentional. |
| `RT03` | Its consumer gives it a default that only applies when the variable is **absent**. CI injects the empty *string*, which is present, so `getenv(NAME, default)` never returns the default. A textual lint, and the finding says so. |
| `RT04` | A declared `Values` enum that `.env.example` violates (error), or that the consumer never mentions (warning — an enum nothing validates). |
| `RT05` | A declared selector matching zero targets. A run dispatched on it executes 0 cases and still exits 0. Names the near-miss when only the separator differs (`smoke-test` vs `smoke_test`). |

A contract with no Wiring or Selectors rows is reported as **unchecked**,
not as passing: silence is not proof. The summary line says so too — it
names how many of the contracts went unchecked, and the word *consistent*
appears only when there was something to check. It is the summary that
survives in a CI log, so it is held to the same standard as the per-contract
line.

`--json` answers with a payload rather than captured prose: `contracts`,
`checked`, `unchecked`, `declared_rows`, `findings` and a `verdict` of
`consistent` / `unchecked` / `failed`. Branch on `verdict` — `ok` and
`exit_code` are 0 for an undeclared surface by design, so they cannot tell
"verified" from "never declared" on their own.

Exits 1 on errors, 0 on warnings only.

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
doctrina next [--json] [--run]
```

Inspects the tree and reports: runtime declarations that no longer hold
(first — a broken wiring is why the last run lied), open changes
(missing proposal, unchecked tasks, deltas ready to apply,
applied-but-unarchived), ADRs still in `proposed` status, accepted ADRs
with nothing proving them yet (suggesting `decision land`), a one-time
skill-capture nudge when no skill exists and an archived change is
fix-shaped, and index drift last (ADR 0011).

On a project that declares no capability yet it names the bootstrap door —
`doctrina intake` for a green field, `doctrina work --from-diff` to backfill
from existing code — because that is the one moment a new agent most needs it
and the one moment nothing else has anything to say.

It also recommends over the **gate** signals `doctrina doctor` reports —
acceptance criteria that are uncovered or cite evidence missing on disk,
product intent no spec realizes, an undeclared build gate, an `active` spec
whose `Implementation:` is still a bare `planned` — from the same collection
the read-only views render, so a recommendation can never contradict the row
it came from. Those signals measure capabilities, so they stay quiet until
one exists: a freshly initialised project is pointed at `intake`, not asked
to write criteria for capabilities it has not named. When nothing is open
and every gate is satisfied, it says so and points at `intake` / `work`.

Read-only without `--run`, and always exits 0 then. Intended for agents
and humans resuming work without re-reading the whole tree.

### Actions are records, not prose

`--json` emits `{ actions }` where each action is:

```json
{
  "id": "change-archive-pending",
  "command": "change archive",
  "args": ["0031-fix-parser"],
  "why": "applied but not archived",
  "gate": "archive",
  "severity": "blocking",
  "runnable": true,
  "text": "doctrina change archive 0031-fix-parser — applied but not archived"
}
```

Branch on `command` and `args` — a consumer re-issues the operation
without parsing English. `text` is the same line the terminal prints,
built from those fields, so the sentence and the record cannot drift.
`id` names the KIND of action, not the instance, so it is stable to
match on.

> **Payload change.** Before this, `actions` was an array of strings.
> A consumer that printed them still works via `actions[i].text`; one
> that concatenated the array directly must be updated.

### `--run`

Executes the first **runnable** action in-process and stops — one
action, not the queue, because the list is recomputed from the tree
after every change to it. Exits with that command's own code.

An action is runnable only when running it unattended is both safe and
the whole of what the action asks for. Anything that needs a person to
*decide* is never runnable, however mechanical its edit would be:

| Action | Runnable | Why |
|---|---|---|
| `index rebuild`, `triage`, `intake`, `analyze` | yes | mechanical and idempotent |
| `change apply`, `change archive` | yes | gated in their own right |
| accept an ADR | **no** | that is the decision, not a header edit |
| complete a task | **no** | ticking the box is not doing the work |
| write a proposal, capture a skill | **no** | authorship |

With nothing runnable, `--run` names the action that needs a person and
exits 0 — refusing is not a failure. Use `doctrina close` when you want
a whole sequence run for you.

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
| `--view <name>` | Render a different shape of the same snapshot: `dashboard` (default), `prime`, `handoff`, `report`. |
| `--since <days>` | With `--view report`: the window (default 7). |
| `--json` | Emit the snapshot as JSON (stable shape for agents and CI). The envelope does not change with `--view` — it is a machine contract. |

**One collector, four views.** `status`, `prime`, `handoff` and `report`
are four shapes of *one* collection of the tree
(`packages/doctrina-cli/src/lib/snapshot.js`), rendered by pure functions
in `lib/views.js`. Before this, they were four commands that each
re-traversed the tree and imported collectors out of each other's
modules — which is how four surfaces end up able to report different
numbers for the same repository. `prime`, `handoff` and `report` remain
their own commands (they are what AGENTS.md tells an agent to run) and
render exactly the bytes `status --view <name>` does; a test asserts the
byte-identity, and another forbids a command module from importing a
binding out of a sibling command module ever again.

## `doctrina close <id...>`

Run the whole closing sequence for a change in one pass (ADR 0012).

```
doctrina close 0001-add-login
doctrina close 0001-add-login --force
doctrina close 0099-nao-existe        # exit 2 before any step: a reference that does not resolve
doctrina close 0001-add-login 0002-rate-limit 0003-audit
```

Drives analyze → **ADR checkpoint** (advisory: the accepted ADRs whose
text cites the touched capabilities, with the amend commands — the
playbook's "record an ADR" step used to be skippable in silence) →
**review** (advisory) → `change apply` → **runtime** → verify → `coverage --strict` → trace →
**docs** → `change archive` → validate → **skill suggest** (advisory:
fix-shaped lessons not yet captured, surfaced while they are fresh),
stopping at the first failure with the exact command to rerun. The
coverage gate is **scoped to the capabilities the change's deltas touch**
(`--only` under the hood), so a deliberately deferred spec elsewhere in
the tree cannot block an unrelated close; a change with no deltas gates
on the whole tree. verify is skipped (with a note) when no `verify.json`
is declared; trace and both advisories never block. A driver over the
existing commands — it adds one check of its own, the docs gate — so
the agent makes one call instead of nine.

**The closing line claims only what ran.** Each word maps to a step —
`verify` → verified, `archive` → archived, `validate` → validated — and a
skipped step loses its word and is named instead. The line used to be a
fixed string, so a close whose step 7 had just printed `skip   no
`.doctrina/verify.json`` still reported the change as *verified*: the one
sentence a human reads before approving, claiming a gate that had not run.
For the same reason a step with nothing to check says so rather than
reporting conformance — "every touched spec's Implementation header
matches" over zero specs is vacuously true — and a step that did check
says how much.

**The runtime gate.** The RT01-RT05 checks `doctrina contract check`
renders, run here as a step: a variable a contract declares under
`vars`/`secrets` that the named workflow does not export, a consumer
default an empty CI value never triggers, a declared enum nothing
validates, a selector that matches zero targets and still exits 0. It
runs after `apply`, because the deltas just merged are what may have
moved the surface the contract describes. Severity decides the level: an
**error blocks** the close (rerun with `doctrina contract check`), a
**warning is reported** and the close continues. A project with no
contracts prints one line and passes; contracts that declare no
`Wiring`/`Selectors` rows are reported **UNCHECKED**, never as passing —
silence is the absence of a declaration, not proof that the wiring holds.
No check is duplicated: `close`, `contract check`, `validate --runtime`,
`triage` and `doctor` all render the same findings from the same source.

**The docs gate.** A change that alters a documented surface — a
command, a flag, an exit code — closes only when documentation moved
with it. A docs phase scheduled *after* the work never happens, so the
requirement sits inside the close. Detection is deterministic on both
sides: the surface signals are read from the change's own proposal and
deltas (with the scaffold's boilerplate subtracted, so the template's
own command references are not mistaken for authored intent), and
whether docs moved is read from git — the working tree plus this
branch's commits against the default branch.

**Citing a command is not changing it.** Two exclusions keep the gate off
the natural way of writing a proposal. A change on the **chore** lane
produces no surface signal at all: the lane is the author's recorded
statement that no behaviour changes and no spec moves, and `analyze`
already reads it that way. And the proposal's `## Verification` section is
skipped, because it answers "how will you know this landed" — the commands
it names are the ones you will RUN, which is why the template's own
checklist was already subtracted. Without these, a change that only
reorganised headings was refused for the two commands its proposal cited
to describe the finding, and had to close with `--force`.

Those two cover the common cases and not the general one. A proposal
explains, and explaining names things: "`coverage` no longer knows this
test exists" describes an effect, and a `## Scope boundaries` line saying
"does not touch `verify`" describes an *absence* — both read to the gate
exactly like a change that alters the command. Three closes in one session
were forced for that reason, and a gate that is routinely forced stops
being a gate: the ledger fills with gaps that were never gaps, and a real
one stops standing out.

No smarter extraction settles it, because the difference is semantic and
ADR 0005 keeps semantics out of a deterministic gate. So the author says
so, on the record, in the grammar the tree already uses for `Realizes:`:

```
- **Documented surface:** n/a — names two commands to explain an effect; alters neither
```

`none` reads the same as `n/a`. A **bare** `n/a` does not silence
anything: a reason is required, exactly as it is for `Realizes: n/a —
<why>` and for the deferral `coverage` honours. The header is a
declaration in the proposal, visible in the diff and in `review` — not a
switch that turns the gate off.

**What counts as surface is yours to declare.** The gate reads the names
your `.doctrina/contracts/` state — the Ports, Environment, Wiring and
Selectors tables and the `Interfaces` section — so a command, an endpoint,
an environment variable or a config key *your* project publishes is
surface, the same way ADR 0023 makes the runtime declared rather than
inferred. Surface a change is *adding* is not in the contract yet, so that
is matched by shape instead: a route, an HTTP method in front of one, an
environment-variable identifier, a `--flag`, an exit code. A project with
no contract falls back to Doctrina's own command catalog and behaves
exactly as it did. Outside a git repository
the gate cannot see what moved and stays silent rather than accusing.
When it refuses, the hint names the documentation locations *your* project
has — the subdirectories under `docs/`, the READMEs it ships, or simply "a
README" when it documents nowhere yet — never a path or a procedure that
exists only in Doctrina's own repository. `--force` closes anyway and
records the gap in the ledger, exactly as `change archive --force` does.

Multiple ids close in sequence, each independently; the exit code is
the worst per-id result. Preview what close would refuse with
`doctrina change check <id>`.

| Flag | Purpose |
|------|---------|
| `--force` | Pass through to `change archive` (archive even if verification is incomplete), and close past a failed docs gate — both record the gap. |

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

## `doctrina constitution` — deprecated

> **Deprecated.** Use `doctrina prime --rules`, which prints exactly these
> lines from the same collection. The old name still works, warns on stderr,
> carries a `deprecated` field in its `--json` envelope, and will be removed
> in a later minor.

Print the project's standing rules in one read.

```
doctrina prime --rules      # preferred
doctrina constitution       # deprecated alias
```

Assembles, read-only: the accepted ADRs (the immutable decisions that govern
how the codebase evolves, oldest first) and the `## Non-goals` of
`product.md`. It is the Spec Kit `constitution.md` analogue — a single place
to see the non-negotiables — but it owns no facts of its own: to change a
principle, supersede the ADR; to change a non-goal, edit `product.md`.

A non-goal may be a bullet or a paragraph — the section's own template
comment invites prose — and a blank line separates one from the next. The
template's instructional comment is never read as a declared non-goal.

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

**First-run states.** A repository with no commits, or a directory that is
not a repository, is a valid state and not a failure: `metrics` reports
"nothing to measure yet" and exits `0`. The same holds for `report`,
`review`, and `skill suggest`. Only git being absent from the machine is an
environment error (exit `4`). `context --diff` still fails when it cannot
compute a diff, but names the condition rather than leaking git plumbing.

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

Every file carries a token estimate (chars/4), and the pack is
**assembled to fit a token budget** rather than merely measured
against one (ADR 0022). The budget resolves as `--budget` >
`config.context_budget` in `index.json` > `15000`.

Over budget, artifacts degrade before any is dropped, least
relevant first: an accepted ADR to title + its decision in one
sentence, an unnamed capability's spec to title + purpose. Every
degradation and omission is named in the report. The core — root
rules, product truth, the named capability's spec, open changes —
is never degraded and never dropped; when it alone exceeds the
budget the command says so and exits 1.

Naming a capability also excludes the ADRs scoped away from it. An
ADR with no `- **Scope:**` header is global and appears in every
pack; see [`doctrina decision scope`](#doctrina-decision-scope-number).

| Flag | Purpose |
|------|---------|
| `--for "<task>"` | Rank the pack by relevance to a task description, so what survives the budget is what the task is about. Ranking is term coverage then density, never document length. It reads the **shared lexicon** (`packages/doctrina-cli/src/lib/lexicon.js`), the same one `doctrina work` ranks a prompt with — the two cannot disagree about which capability a task is about, which matters because the work playbook tells the agent to run them back to back. The lexicon folds accents (a Portuguese prompt matches an ASCII spec) and drops the verbs every prompt carries — "add", "new", "create", "implementar" — alongside the grammar, since none of them says anything about *which* capability. |
| `--concat` | Print the file contents with path separators instead of the list — ready to hand to an agent. The budget verdict goes to stderr, keeping stdout pure. Degraded artifacts print as title + summary + a pointer to the full text. |
| `--budget <n>` | Token ceiling for this call, overriding the project's `config.context_budget`. |
| `--diff <ref>` | Scope the stable artifacts (AGENTS.md, product.md, specs, ADRs) to those changed since the git ref; open changes are always included. The resume-session read. |

With no capability and no `--for` there is nothing to retrieve on,
so the pack degrades to an orientation index: every capability by
title and purpose, every decision by title and summary. Naming a
capability is how you ask for its truth in full.

A capability the tree does not know — no spec on disk, and no open
change staging a delta for it — is a typo, not a pack: the command
names it, suggests the near miss, and exits 2 rather than printing a
global pack under a scoped heading. A capability an open change is
staging counts as known, because writing that spec is exactly when
you need the read.

This is the read-order section of AGENTS.md turned into tooling:
selection over dumping. Read-only; exits 0, 1 when the pack's core
alone cannot meet the budget, or 2 when the named capability does
not exist.

## `doctrina search <term> [...]`

Case-insensitive search across the artifact tree, grouped by
category.

```
doctrina search saml login
doctrina search quota --archive
```

Every term must match on the same line (AND). Categories: specs,
decisions, changes, skills, product, AGENTS.md. The change archive
is excluded unless `--archive` is passed. Read-only — answers "where
is X decided?" without knowing the tree layout. Finding nothing is an
answer, not a refusal: the command says so and exits 0, like every
other view.

## `doctrina prime`

The session primer: the ~40-line read that orients an agent at the
start of a session.

```
doctrina prime
```

Prints, in one read: the gate digest (index state, coverage %, trace
anchors, verify checks), the artifact counts, the standing rules
(accepted ADR titles + non-goal count), every open change with its
task progress, and the top next actions. It sits between `status`
(numbers only) and `context --concat` (everything): enough to act,
cheap enough to run every session. Read-only; always exits 0.

| Flag | Purpose |
|------|---------|
| `--rules` | Print the standing rules in FULL instead of the primer: every accepted ADR and every declared non-goal. The lines `doctrina constitution` printed, from the same collection. |

The primer keeps a fixed size on purpose — it is read at the start of
every session — so the full non-goal text lives behind `--rules`
rather than in the primer itself.

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
explicit numbers. Both count authored content only: a bullet inside an
HTML comment — the EARS legend the spec scaffold ships, for one — is
annotation and is never numbered. Read-only.

A spec delta's `replace-requirement <section> <n>` numbers differently
and on purpose: it counts within one `### <section>`, so its number
stays put when another section grows. `doctrina show <cap>-RN` prints
the section the requirement landed in, which is what turns an `R`
reference into the delta's pair of coordinates.

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

Sequences the existing checks — the structural checks (`validate`), the
index drift check, the coverage/trace ratios, the clean-checkout lint
(`verify --clean`), the template-shape check, the **runtime** surface,
and the verify-config presence — and reports each area as ok/warn/FAIL.
The `config` row reports the file first: an unparseable or rejected
`config.json` fails it naming the error (the values it fell back to are
not the file), and an unknown key warns with the keys it accepts. Rows
report
**with its exact remediation command**. A driver over the same
collections the gates render (like `close`): it adds no checks of its
own, so it can never disagree with the gates it fronts, and the whole
run is one process — it does not start the CLI again to answer a row.
`close` works the same way: a step its sequence declares but the driver
does not implement is reported as unimplemented, naming the command that
answers it, rather than shelled out to a second process. One question,
one answer, in both drivers.
Read-only, which here also means it never repairs: `validate --fix`
heals a drifted index, `doctor` only reports one. Exits 1 when any area
fails.

The runtime row reports a project with contracts but no Wiring or
Selectors rows as **unchecked**, never as ok: an undeclared surface is
not a verified one.

The **budgets** row reports the two size ceilings that are *coupled*:
`agents-md-lines` and `surface-block-lines`. The generated command-surface
block is written into AGENTS.md, so one command added to the catalog spends
a line of each — the headroom the row prints is the smaller of the two
slacks, not either one alone. Both are declared **output** budgets, so
`analyze` refuses a change that resolves an overflow by raising them; the
row therefore reports the slack *before* it runs out, while there is still
a choice about what to cut. Both numbers come from their owner
(`agentsMdBudget`, `surfaceBudget`), so this row can never quote a size
`validate` or `templates check` disagrees with.

| Flag | Purpose |
|------|---------|
| `--env` | Also check the local `.env` against the declared names and enums. Reports membership only — a rejected value is **never printed**, so the output is safe to paste into an issue or a CI log. |

## `doctrina report`

Markdown digest for a period — the standup / PR-description view.

```
doctrina report
doctrina report --since 30
```

| Flag | Default | Purpose |
|------|---------|---------|
| `--since <days>` | `7` | Window size in days. |
| `--agent-changelog` | off | Draft the AGENTS.md "What changed" block instead of the digest. |

Sections: gate state, changes archived in the window (from the index
ledger), capability churn (from the archive ledger), open work with
task progress, artifact counts, and a local-git summary (commits, fix
share, top-churn files). Read-only; no network. `doctrina metrics` has
the deeper git-derived numbers.

With no history to read, the git section names the one condition that
actually holds — git absent, not a repository, or a repository with no
commits yet — from the same `lib/git.js` door `metrics` and `context` ask,
so the three never disagree about one repository.

### Drafting the agent changelog

`--agent-changelog` answers a different question for a different
audience: what must an agent arriving at the next release do
differently? It proposes one candidate bullet per archived change that
touched a **documented surface** — a command, a flag, an exit code —
newest first, capped at the five bullets the block is allowed. The
window is "since the last tag" unless `--since` names one, and the
output states which window it used.

```
doctrina report --agent-changelog
```

It **proposes**; a person cuts and rewrites. The draft knows which
surface a change touched, not what an agent must now do about it, and
that judgement is not one the CLI makes (ADR 0005). A change that
touched no documented surface proposes nothing — which is a valid
answer, not an empty one. The cap is not a style preference either:
`AGENTS.md` is always-loaded context under a hard line budget, so
candidates that do not fit are listed and left for you to choose
between, never dropped silently.

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

## `doctrina ci --emit <target>`

Emit the CI pipeline for the declared gate sequence, on stdout.

```
doctrina ci --emit github > action.yml
```

Which gates a pipeline runs is declared once, in `SEQUENCES.ci`
(`packages/doctrina-cli/src/lib/gates.js`) — the same declaration
`close` executes step by step and `doctor` reports as rows. Before this
existed there were four hand-maintained lists (close's array, doctor's
rows, `action.yml`, `verify.json`) and nothing that noticed when they
diverged, which is how a gate could be in the close and absent from CI
for a whole release.

The action stays **versioned in the repository** rather than generated
on demand: a project that writes `uses: <owner>/<repo>@v1` has no CLI to
generate it with, and a composite action that only exists after an npm
install is not an action. So the workflow is: change the declaration,
re-emit, commit the result. A drift test compares the committed
`action.yml` against this command's output byte for byte, so a stale
file fails the suite instead of silently shipping.

Read-only — it writes nothing, so redirect it yourself.

| Target | Output |
|--------|--------|
| `github` | A composite GitHub Action (this repository's own `action.yml`). |

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

   The block carries a **trigger per command** — what it does and the
   moment you reach for it (ADR 0020) — and has a declared 40-line budget
   that `templates check` enforces. Beside it, a generated
   `## What changed in <version>` block of three to six lines states only
   what alters agent behaviour, so an agent reading AGENTS.md after an
   upgrade learns what is new without being told to look.

   The block has **one canonical position**, defined by the shipped
   template and used by both `init` and `upgrade`: immediately after
   "Working from intent". A project that has no block gets one placed
   there rather than appended, so upgrading does not bury the command
   surface behind everything the agent reads first. Running it twice is
   a no-op. In preview, the pending change is shown as a real diff —
   the lines that would change, or the block body and its destination —
   rather than a one-line summary.
2. `index rebuild` — regenerate index.json from the tree and migrate the
   `framework_version` stamp to the running CLI.
3. `validate` (`--fix` under `--write`) — surface anything the upgrade
   cannot fix (hand-authored drift, new validate checks).

One `upgrade --write` covers **every installed agent**: the adapters
(CLAUDE.md, GEMINI.md, `.cursor/rules/…`, …) are thin pointers at
AGENTS.md and carry no command surface of their own, so refreshing the
hub's surface block is refreshing what every agent reads. `templates
check` (step 1) verifies each installed adapter still points at the hub.

## Environment variables

| Variable | Effect |
|----------|--------|
| `NO_COLOR` | Disables ANSI colour in CLI output (per https://no-color.org). |
| `FORCE_COLOR=0` | Same as `NO_COLOR`. |
| `FORCE_COLOR` (any other value) | Forces colour even when stdout is not a TTY. |
