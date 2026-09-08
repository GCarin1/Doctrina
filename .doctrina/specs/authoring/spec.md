# Spec — Artifact Authoring Commands

**Capability:** authoring
**Status:** active
**Implementation:** implemented
**Realizes:** n/a — internal framework capability; product success criteria measure adopting-team outcomes, not the tool's own surface
**Depends on:** cli
**Last updated:** 2026-09-07
**Version:** 0.5.0

## Purpose

Define the semantics of the commands that AUTHOR and ADVANCE the artifacts
inside a Doctrina project: `intake` and `work` (turning intent into a
change), `spec`, `change`, `decision`, `contract`, `skill` and `intent`
(creating and moving each artifact through its lifecycle), and `triage`
(deciding which lane a request belongs to before anything is scaffolded).

What these commands share is a target — the artifacts under `.doctrina/`,
whose on-disk grammar ADR 0021 owns — and a discipline: they scaffold from
the canonical templates and stop where judgement begins, leaving every
semantic decision to the agent (ADR 0005).

Split out of the `cli` spec the third time that spec crossed its 400-line
cap, when its own context pack reached the budget ceiling and began omitting
accepted decisions (ADR 0022). The seam is the one the `cli` spec's Purpose
already named: the surface itself — the executable, its flags, its exit
codes and the conventions every command shares — against the commands that
write the tree. The `cli` spec keeps the surface; `scaffolding` keeps the
commands that materialise and maintain the project; `gates` and `insight`
keep the checks and the read path.

## Requirements (EARS)

### Ubiquitous

- The system shall support the EARS requirement verbs `append-requirement <section>: <text>` and `replace-requirement <section> <n>: <text>` in a MODIFIED delta's ops block, resolving bullet position and numbering at apply time so concurrent open changes appending to the same spec cannot collide.

- The system shall treat the lane classification as a hint and never a refusal: `--force` opens the change regardless, and `--chore` selects the spec-less lane directly.

- The system shall default an unclassifiable request to the PRODUCT lane, so that a lane is only changed by a signal and never by the absence of one.
- The system shall rank an accepted decision that names a capability in its `Scope:` header above one that reaches that capability only through a declared dependency, and both above an unscoped decision, when assembling that capability's context pack.

### Event-driven

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

- When `doctrina spec new <capability>` runs, the system shall scaffold a
  `**Realizes:**` header in the new spec from the capability template, so the
  intent link is opt-out (record `n/a — <why>`) rather than opt-in.

- When `doctrina spec new <capability> --bug` runs, the system
  shall scaffold the capability spec from
  `templates/spec-bug.md.template` instead of
  `templates/spec.md.template`.

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

- When `doctrina change diff <id>` runs, the system shall print,
  for each spec delta in the change: for ADDED, the target path
  and the delta body line count; for REMOVED, the target path to
  be deleted; for MODIFIED, a line-level diff between the current
  target spec and the delta body, with the caveat that the delta
  body is a fragment to merge, so context lines absent from the
  delta are not removals. The command is strictly read-only.

- When `doctrina change archive <id>` runs, the system shall
  append a one-line summary (date, id, title, affected specs) to
  `.doctrina/changes/archive/LEDGER.md`, creating the ledger on
  first use. The CLI only appends; it never rewrites existing
  ledger lines.

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

- When `doctrina contract new <name>` runs, the system shall scaffold
  `.doctrina/contracts/<name>.md` and index it under
  `artifacts.contracts`; `doctrina contract check` shall error on a port
  collision or a missing referenced `specs/<capability>`, and warn when a
  declared environment variable is absent from `.env.example`.

- When `doctrina change archive <id>` runs, the system shall refuse
  (exit 1) while any checkbox in `tasks.md` (closing steps included) or
  the proposal's `## Verification` section is unchecked, unless `--force`
  is supplied — which archives and records the gap.

- When `doctrina skill suggest` runs, the system shall list fix-shaped
  lessons whose skill is not yet captured, drawn from two deterministic
  sources — archived changes and the git commit history — deduplicated by
  slug; with `--write` it shall scaffold a stub per candidate (pre-seeded
  from its source) and index it, and with `--since <ref>` it shall scan
  commits in `<ref>..HEAD` instead of the most recent window (ADR 0013).

- When `doctrina intent add "<text>"` runs, the system shall append a new
  intent anchor bullet (`- [SC5] <text>`) to product.md's Success criteria,
  allocating the next number for the dominant prefix (or honouring an
  explicit `"SC15: <text>"` form, refusing a duplicate id), and shall print
  the `**Realizes:**` follow-up; `doctrina intent list` shall print every
  anchor in document order. Read-only apart from the appended bullet
  (0.12.0 field-review follow-ups; ADR 0014).

- When `doctrina change apply <id>` processes an ADDED delta whose target
  spec is still the untouched `spec new` scaffold, the system shall replace
  the scaffold with the delta body; a target with real content shall refuse
  with a MODIFIED/REMOVE hint (ADR 0014).

- When `doctrina change archive <id>` archives a proposal still marked
  `proposed` (the manual-merge path), the system shall stamp it
  `applied` with an `Applied:` date before the move, so the archived file
  never contradicts the ledger (ADR 0014).

- When `doctrina work` derives a change id from a prompt longer than the
  slug cap, the system shall truncate the slug at a word boundary; with
  `--title "<short>"` the title shall drive the slug and the proposal H1
  while the full prompt still lands under `## Why` (ADR 0014).

- When `doctrina change new` runs, the system shall scaffold `design.md`
  only under `--design` (ADR 0014).

- When `doctrina spec set <cap> --version X.Y.Z` runs, the system shall set
  the spec's `Version:` header explicitly, and every `spec set` output
  shall echo the SPEC's resulting version, not the CLI's (ADR 0014).

- When `doctrina change check <id...>` runs, the system shall report, read-only: analyze's structural findings, every MODIFIED delta's ops block executed in memory against its target spec, the archive-gate blockers, and an advisory list of accepted ADRs whose text cites the touched capabilities; with `--verbose` it shall additionally print, per delta, what applying it would do to its target — the same preview the deprecated `change diff` prints.

- When `doctrina change tick <id>` runs, the system shall list the unchecked boxes of `tasks.md` and the proposal's `## Verification` section in one ordinal space, and shall check the boxes named by ordinal arguments or every box under `--all`.

- When `doctrina work` opens a change and can name the affected capability — pinned with `--capability <cap>`, or ranked first by term overlap with a margin over the runner-up that the ranking's length tie-breaker alone cannot produce — the system shall scaffold `specs/<cap>/delta.md` inside the change with the `**Operation:**` header prefilled (MODIFIED when the target spec exists, ADDED when it does not), and under `--quiet` shall print a one-line confirmation instead of the playbook.

- When `doctrina change tick` targets a box whose text is empty, the system shall refuse without ticking anything and shall name the fix; the tick listing shall mark such boxes as scaffold placeholders.

- When `doctrina change abandon` runs without `--force`, the system shall list the files it would delete, state that the deletion cannot be undone, and require confirmation; off a terminal it shall refuse rather than proceed.

- When `doctrina decision scope` runs, the system shall report the capabilities each ADR governs and propose one for each unscoped ADR from the archived change that cites it, applying them only under --write.

- When `doctrina triage "<prompt>"` runs, the system shall classify the request as PRODUCT, RUNTIME or CHORE by deterministic term matching, print the signals it matched, and print that lane's playbook.

- When `doctrina triage` runs with or without a prompt, the system shall run the declared runtime checks over every contract and exit 1 when any runtime error stands.

- When `doctrina work` receives a prompt that classifies as RUNTIME with a margin over the runner-up lane, the system shall hold the request with the precondition exit code, name the diagnosis path, and scaffold nothing.

- When `doctrina skill suggest --from-error <text|file>` runs, the system shall draft one skill from that failure with a trigger built from the error's paths, identifiers and distinctive terms, and shall treat the flag given without a value as a usage error.

- When `doctrina work` opens a change, the system shall record in the proposal the lane the request classified as, how confident that reading was, the signals that decided it, and any lane the operator chose instead.

- When `doctrina work` scaffolds a delta from the ranking rather than from `--capability`, the system shall mark the file as a guess — naming the score it won on, the capability it beat, and the command that removes it — and shall say so in the playbook's spec-delta step, including on `--resume`, where the mark is read back from the file.
- When a capability spec cites a decision whose `Scope:` header does not name that capability, the system shall report it, naming the header to extend.
- When a decision record is accepted, the system shall re-derive its whole index entry from the file, so the summary and scope the author wrote before accepting are the ones recorded.
- When a change is opened without an explicit title, the system shall derive the identifier from the prompt's content words rather than from the whole prompt, and shall keep the whole prompt as the proposal's title.

### Unwanted-behavior (must-not)

- The system shall not mutate the body of an accepted ADR; only the
  `Status:` and `Superseded by:` headers may be rewritten, and only by
  the `decision accept` and `decision supersede` commands.

- The system shall not auto-merge arbitrary MODIFIED spec prose; only a
  delta's declared, bounded `ops` block (headers and acceptance-criteria
  markers) is applied mechanically (ADR 0007), and any other MODIFIED
  body is left for the user to merge.

- The system shall not execute an ops block that sits inside an HTML comment of a delta (the scaffolded template carries an example block in its instructional comment).

- The system shall not treat a token substitution as authorship when deciding whether a scaffolded file is pristine; comparison is by template shape, excluding the volatile date line and the CLI-owned surface block.

- The system shall not let a recorded lane change what any gate decides; it is a historical record, and a change carrying an unrecognised lane shall be treated exactly as one carrying none.

- The system shall not scaffold a delta from a ranked capability whose lead over the runner-up is within the ranking's length tie-breaker, nor from the `--from-diff` or `--chore` paths.
- The system shall not accept a decision record whose Context, Decision or Consequences section is still the shipped template, and shall name the sections that remain unwritten.

## Acceptance criteria

The authoring commands are v0 spec-compliant when:

1. [verified] A hollow change cannot close: analyze fails on scaffold placeholders, `change tick` refuses empty boxes, validate warns on every run — verified by `packages/doctrina-cli/test/integration.test.js`.
2. [verified] `decision scope` proposes from the ledger, prefers it over text matching, and writes only under --write — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
3. [verified] `decision new` and `index rebuild` produce the same record, so a freshly created ADR is never index drift — verified by `packages/doctrina-cli/test/integration.test.js`.
4. [verified] A runtime-shaped prompt is held by `work` with exit 3 and scaffolds nothing, while `--force` and `--chore` proceed — verified by `packages/doctrina-cli/test/runtime-commands.test.js`.
5. [verified] The classifier separates the three lanes and defaults an unclassifiable prompt to PRODUCT — verified by `packages/doctrina-cli/test/runtime-commands.test.js`.
6. [verified] `skill suggest --from-error` drafts a trigger that satisfies validate's trigger check, and refuses a valueless flag — verified by `packages/doctrina-cli/test/orchestration.test.js`.
7. [verified] A change opened by `work` records its lane, confidence and signals, and an operator who overrides the reading has that disagreement recorded too — verified by `packages/doctrina-cli/test/lane-record.test.js`.
8. [verified] The lane reaches the index, its absence is left absent rather than guessed, and a report counts an unrecorded lane as unknown — verified by `packages/doctrina-cli/test/lane-record.test.js`.
9. [verified] Rewriting a proposal's lane to a nonsense value changes no gate's verdict or output — verified by `packages/doctrina-cli/test/lane-record.test.js`.
10. [verified] `work` scaffolds the winning capability's delta with `**Operation:** MODIFIED` and a guess mark when the prompt ranking has a real margin, writes nothing when it does not, and never marks a pinned delta a guess — verified by `packages/doctrina-cli/test/scaffolded-delta.test.js`.
11. [verified] Every line `change diff` prints appears in `change check --verbose`, and the plain check stays the summary it was — verified by `packages/doctrina-cli/test/deprecation.test.js`.
12. [verified] Every decision this repository's specs cite names the citing capability, the `authoring` pack keeps all of them, a decision that names a capability outranks one it only inherits even when its number is older, and an unscoped decision is never reported as a violation — verified by `packages/doctrina-cli/test/adr-scope-follows-capability.test.js`.
13. [verified] An untouched decision record is refused with its unwritten sections named and its Status left alone, one with a one-line decision is accepted, and accepting leaves the index in sync — verified by `packages/doctrina-cli/test/the-mould-is-not-content.test.js`.
14. [verified] A change opened on the default path has an identifier under fifty characters while its H1 still carries the whole prompt and the parse returns it whole, `--title` decides both halves as before, and the derivation is deterministic — verified by `packages/doctrina-cli/test/change-title.test.js`.

## Out of scope for this spec

- The command surface itself — the executable, help and version, flag
  declaration and parsing, exit-code classes, JSON output, and the
  cross-cutting doors (git, the lexicon, the usage log) — covered by the
  `cli` capability spec.
- Project scaffolding and maintenance (`init`, `adapter`, `templates`,
  `hooks`, `index`, `upgrade`, `watch`, `metrics`, `completion`) — covered
  by the `scaffolding` capability spec.
- The gates that judge what these commands wrote (`analyze`, `validate`,
  `coverage`, `trace`, `review`, `verify`, `close`) — covered by the
  `gates` capability spec, and the read path by `insight`.
- Semantic judgement of any artifact's content: whether a requirement is
  the right requirement stays the agent's job (ADR 0005).
