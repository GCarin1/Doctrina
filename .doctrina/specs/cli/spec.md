# Spec — Command-Line Interface

**Capability:** cli
**Status:** active
**Implementation:** implemented
**Realizes:** n/a — internal framework capability; product success criteria measure adopting-team outcomes, not the tool's own surface
**Last updated:** 2026-08-06
**Version:** 0.38.0

## Purpose

Define the `doctrina` command surface, the contracts the scaffolding
and workflow commands honour, the implementation constraints the
package follows, and the exit-code conventions. The canonical
operation catalog is `OPERATIONS` in
`packages/doctrina-cli/src/lib/commands.js` — the single place the
surface is named; `--help` is generated from it, and drift tests hold
it equal to the dispatch table, the AGENTS.md hub, and the CLI
reference docs (EN and PT). Gate, read-path, and insight command
semantics are specified in the `gates` capability spec; this spec
owns the surface itself and the conventions every command shares.

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

- The system shall support the EARS requirement verbs `append-requirement <section>: <text>` and `replace-requirement <section> <n>: <text>` in a MODIFIED delta's ops block, resolving bullet position and numbering at apply time so concurrent open changes appending to the same spec cannot collide.

- The system shall declare each command's accepted flags in that command's own module, and shall parse an invocation in two passes — resolving the command name first, then re-parsing with that command's declared flags merged over the global set.

- The system shall accept a declared flag in any position relative to the command's positional arguments, with identical results.

- The system shall exit with one of five documented classes: 0 success, 1 a failed gate, 2 a wrong invocation, 3 a missing precondition, 4 an environment that cannot run the command.

- The system shall define the exit-code classes in one module, print them in the top-level help from that same definition, and document them in the user-facing reference.

- The system shall invoke and interpret git in one module, distinguishing a repository with history from an empty one, from a directory that is not a repository, and from a command that failed; no other module shall invoke git directly.

- The system shall accept a JSON output flag on every command and emit a payload carrying a schema version, the invocation, a success flag, and the exit code.

- The system shall derive a decision's index record in exactly one place, so that creating an ADR and rebuilding the index produce the same record.
- The system shall typecheck its own source with checkJs and shall emit nothing, so the published package stays plain ESM that node runs with no transpile step.
- The system shall declare the shapes it passes between modules — the index record, the flag map, the artifact model, the context pack item — rather than relying on inference from a first use.
- The system shall record which operation ran only when the operator names a log file, shall record the operation alone and never its arguments, and shall make no network call.
- The system shall treat the lane classification as a hint and never a refusal: `--force` opens the change regardless, and `--chore` selects the spec-less lane directly.
- The system shall default an unclassifiable request to the PRODUCT lane, so that a lane is only changed by a signal and never by the absence of one.
- The system shall define in one module the vocabulary it reads natural language with — how text is folded, which words carry no signal, and how strongly a document answers a query — and every command that ranks or classifies text shall read it from there.

### Event-driven

- When the user invokes an unknown top-level command or
  subcommand, the system shall suggest the closest match by edit
  distance when one exists within a threshold of three.

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

- When `doctrina next` runs, the system shall inspect the
  `.doctrina/` tree and print the recommended next workflow
  actions in priority order: a pending `.doctrina/intake.md`
  (not yet `converted`), open changes (missing proposal,
  unchecked tasks, deltas ready to apply, applied but not
  archived), ADRs still in `proposed` status, accepted ADRs with
  neither `Evidence` nor `Landed` proving them (suggesting
  `decision land`), a single skill-capture nudge when no skill
  exists yet and an archived change is fix-shaped, and index drift
  last. When no work is open the system shall say so and point at
  `change new` and `spec new`. With `--json` the system shall emit
  the action list as JSON. The command is strictly read-only
  and shall exit 0.

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

- When a spec declares a `**Depends on:** <caps>` header, the system shall
  record the capability list in the index, show the graph in `doctrina why`
  (both directions), pull the dependency specs into `doctrina context
  <cap>`, and flag dependents of touched capabilities in `doctrina review`
  (ADR 0014).

- When `doctrina change check <id...>` runs, the system shall report, read-only: analyze's structural findings, every MODIFIED delta's ops block executed in memory against its target spec, the archive-gate blockers, and an advisory list of accepted ADRs whose text cites the touched capabilities.

- When `doctrina change tick <id>` runs, the system shall list the unchecked boxes of `tasks.md` and the proposal's `## Verification` section in one ordinal space, and shall check the boxes named by ordinal arguments or every box under `--all`.

- When `doctrina work` runs with `--capability <cap>`, the system shall scaffold `specs/<cap>/delta.md` inside the change with the `**Operation:**` header prefilled (MODIFIED when the target spec exists, ADDED when it does not), and under `--quiet` shall print a one-line confirmation instead of the playbook.

- When `doctrina close`, `doctrina change apply`, `doctrina change archive`, or `doctrina change check` receive multiple ids, the system shall run each id independently and exit with the worst per-id result.

- When `doctrina close` runs, the system shall print an advisory ADR checkpoint (accepted ADRs whose text cites the touched capabilities, with the amend commands) after analyze, and an advisory `skill suggest` listing after validate; neither shall block the close.

- When `doctrina clarify` runs with `--lang pt` or `--lang en`, the system shall apply that lexicon regardless of the project config and the per-file stopword heuristic.

- When `doctrina validate` finds an open change's delta whose `**Operation:**` header is missing or not one of ADDED, MODIFIED, or REMOVED, the system shall warn, naming the file and the fix.

- When `doctrina analyze` finds `tasks.md` still carrying a scaffold placeholder task (`- [ ]` with no text, checked or not), the system shall fail, telling the operator to plan the change before implementing; `change check` and `close` inherit the refusal.

- When `doctrina change tick` targets a box whose text is empty, the system shall refuse without ticking anything and shall name the fix; the tick listing shall mark such boxes as scaffold placeholders.

- When `doctrina validate` finds an open change whose `tasks.md` still carries scaffold placeholder tasks, the system shall warn that the change was opened but never planned.

- When a command cannot run because the project is not set up, the system shall exit with the precondition class and name the setup command that clears it.

- When a history-reading command runs where there is no history, the system shall report that there is nothing to measure and exit successfully, rather than surfacing a git plumbing error.

- When `doctrina change abandon` runs without `--force`, the system shall list the files it would delete, state that the deletion cannot be undone, and require confirmation; off a terminal it shall refuse rather than proceed.

- When a command with no structured payload of its own runs with the JSON flag, the system shall return its human output as string arrays inside the versioned envelope, with terminal colour removed.

- When `doctrina decision scope` runs, the system shall report the capabilities each ADR governs and propose one for each unscoped ADR from the archived change that cites it, applying them only under --write.
- When the declared verification checks run, the system shall run the typecheck first, before the test suite.
- When recording a usage sample fails for any reason, the system shall continue and report the command's own result unchanged.
- When `doctrina metrics --commands` runs, the system shall report the operations invoked and the catalog operations never invoked in that sample.
- When `doctrina triage "<prompt>"` runs, the system shall classify the request as PRODUCT, RUNTIME or CHORE by deterministic term matching, print the signals it matched, and print that lane's playbook.
- When `doctrina triage` runs with or without a prompt, the system shall run the declared runtime checks over every contract and exit 1 when any runtime error stands.
- When `doctrina work` receives a prompt that classifies as RUNTIME with a margin over the runner-up lane, the system shall hold the request with the precondition exit code, name the diagnosis path, and scaffold nothing.
- When `doctrina skill suggest --from-error <text|file>` runs, the system shall draft one skill from that failure with a trigger built from the error's paths, identifiers and distinctive terms, and shall treat the flag given without a value as a usage error.
- When `doctrina context --for "<task>"` runs, the system shall rank on-demand skills by the task's match against their trigger and mark the ones that match.
- When `doctrina next` runs, the system shall compute the recommended actions as records carrying a stable kind id, the operation and its arguments, the reason, the gate it clears, a severity, and whether it may be run unattended, and shall derive the printed line from those same fields.
- When `doctrina next --run` runs, the system shall execute the first runnable action in process and stop, exiting with that command's own code; when no action is runnable it shall name the action that requires a person and exit successfully.
- When two surfaces rank the same text, the system shall rank it identically, deriving any single score from the same relevance it orders by rather than computing a second one.
- When a caller asks which files changed, the system shall distinguish an empty answer from an inability to answer, and shall let the caller choose whether untracked files and a branch's earlier commits count.

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

- The system shall not execute an ops block that sits inside an HTML comment of a delta (the scaffolded template carries an example block in its instructional comment).

- The system shall not treat a token substitution as authorship when deciding whether a scaffolded file is pristine; comparison is by template shape, excluding the volatile date line and the CLI-owned surface block.

- The system shall not read a flag a command has not declared, and shall not document an undeclared flag in a command's Options block.

- The system shall not report a missing precondition or an unusable environment with the same code as a failed gate.

- The system shall not report a git invocation that exited non-zero as a successful empty result.

- The system shall not treat a non-interactive stdin as consent for a destructive operation.

- The system shall not emit terminal colour codes in JSON output, and shall not let a command writing directly to the output stream escape the envelope.

- The system shall not accept a value-taking flag written without a value; it shall report a usage error rather than fall back to the default.
- The system shall not treat an action that requires a human decision — accepting a decision, completing a task, authoring a proposal or a skill — as runnable, however mechanical the resulting edit would be.

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
3. [verified] Every operation the dispatch switches accept appears in
   `--help` and in the CLI reference docs (EN and PT) — the surface
   catalog is `packages/doctrina-cli/src/lib/commands.js` and the
   drift tests live in `packages/doctrina-cli/test/commands.test.js`.
4. [verified] `npm pack --dry-run` inside `packages/doctrina-cli/` lists
   only `src/`, `templates/` (copied from `.doctrina/templates/` by the
   `prepack` script), `README.md`, and `package.json` in the published
   tarball — governed by `packages/doctrina-cli/package.json`.
5. [verified] The runtime `dependencies` field of the package is absent
   or `{}` — see `packages/doctrina-cli/package.json`.
6. [verified] Operator-review follow-ups behave as specified: change check/tick, batch ids on close/apply/archive/check, the prefilled work delta and `--quiet`, the close advisories, `clarify --lang`, the regenerated doctrina:surface block, and the EARS requirement verbs — verified by `packages/doctrina-cli/test/integration.test.js`, `packages/doctrina-cli/test/spec-ops.test.js`, `packages/doctrina-cli/test/commands.test.js`.
7. [verified] A hollow change cannot close: analyze fails on scaffold placeholders, `change tick` refuses empty boxes, validate warns on every run — verified by `packages/doctrina-cli/test/integration.test.js`.
8. [verified] Every command declares a flag spec, every flag read is declared, and every flag documented in an Options block is declared — verified by `packages/doctrina-cli/test/flag-catalog.test.js`.
9. [verified] A declared flag placed before the positionals behaves identically to one placed after — verified by `packages/doctrina-cli/test/flag-catalog.test.js`.
10. [verified] A representative failure of each class returns its documented code, and the top-level help prints the contract — verified by `packages/doctrina-cli/test/exit-codes.test.js`.
11. [verified] Every literal exit return in a command module maps to a documented class — verified by `packages/doctrina-cli/test/exit-codes.test.js`.
12. [verified] Every history-reading command runs cleanly on a repository with no commits and on a directory that is not a repository, leaking no git plumbing — verified by `packages/doctrina-cli/test/integration.test.js`.
13. [verified] `change abandon` without confirmation deletes nothing and names the non-interactive escape; `init` without a description scaffolds nothing — verified by `packages/doctrina-cli/test/integration.test.js`.
14. [verified] No mutating command alters authored `AGENTS.md` or `product.md` content, and `intent add`, whose contract is to append an anchor, preserves every authored line — verified by `packages/doctrina-cli/test/integration.test.js`.
15. [verified] Every command declares the JSON flag and emits parseable output carrying the schema version, the command, and the exit code — verified by `packages/doctrina-cli/test/json-output.test.js`.
16. [verified] The envelope's success flag and exit code agree with the process exit status, and JSON output carries no ANSI escapes even when colour is forced — verified by `packages/doctrina-cli/test/json-output.test.js`.
17. [verified] `decision scope` proposes from the ledger, prefers it over text matching, and writes only under --write — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
18. [verified] `decision new` and `index rebuild` produce the same record, so a freshly created ADR is never index drift — verified by `packages/doctrina-cli/test/integration.test.js`.
19. [verified] `tsc --noEmit` reports zero errors across every file under `packages/doctrina-cli/src/` and `scripts/` — run by `doctrina verify` and by CI.
20. [verified] Every source file under `src/` carries `// @ts-check`, so the file stays checked in an editor that does not load the project tsconfig — `packages/doctrina-cli/test/typecheck.test.js`.
21. [verified] The published tarball contains no TypeScript configuration or type declarations, and the package declares no runtime dependencies — `packages/doctrina-cli/package.json`.
22. [verified] No usage file appears unless DOCTRINA_USAGE_LOG names one, and no argument, path, id or prompt reaches the log — `packages/doctrina-cli/test/usage.test.js`.
23. [verified] An unwritable log target does not throw and does not change the command's exit code — `packages/doctrina-cli/test/usage.test.js`.
24. [verified] A sub-operation is recorded only when the catalog carries it, so a capability argument is not mistaken for one — `packages/doctrina-cli/test/usage.test.js`.
25. [verified] A runtime-shaped prompt is held by `work` with exit 3 and scaffolds nothing, while `--force` and `--chore` proceed — verified by `packages/doctrina-cli/test/runtime-commands.test.js`.
26. [verified] The classifier separates the three lanes and defaults an unclassifiable prompt to PRODUCT — verified by `packages/doctrina-cli/test/runtime-commands.test.js`.
27. [verified] `skill suggest --from-error` drafts a trigger that satisfies validate's trigger check, and refuses a valueless flag — verified by `packages/doctrina-cli/test/orchestration.test.js`.
28. [verified] An action carries the operation and its arguments, so a consumer re-issues it without parsing prose — verified by `packages/doctrina-cli/test/actions.test.js`.
29. [verified] The lines printed by `next`, `prime` and `handoff` are unchanged by the move to records — verified by `packages/doctrina-cli/test/actions.test.js`.
30. [verified] `--run` executes a runnable action and refuses one that needs a person, ticking and accepting nothing on the way past — verified by `packages/doctrina-cli/test/actions.test.js`.
31. [verified] No module outside the git door invokes git, and no module outside the lexicon carries a second stop list or fix-shaped pattern — verified by `packages/doctrina-cli/test/one-door.test.js`.
32. [verified] The changed-files door reports a clean tree and an unanswerable question differently, and its merge-base option is what makes a branch's earlier commits count — verified by `packages/doctrina-cli/test/one-door.test.js`.
33. [verified] `work` and `context --for` choose the same capability for the same prompt, in either language, with accents folded — verified by `packages/doctrina-cli/test/one-door.test.js`.
34. [verified] Relevance is a tuple and the score is its projection, so a long document cannot out-rank a focused one on volume — verified by `packages/doctrina-cli/test/one-door.test.js`.

## Out of scope for this spec

- Gate and insight command semantics (`analyze`, `clarify`, `validate`,
  `coverage`, `trace`, `review`, `verify`, `close`, `status`, `why`,
  `constitution`) — covered by the `gates` capability spec.

- Remote operations, network calls, telemetry.

- Auto-merging arbitrary MODIFIED prose; only the bounded `ops` block
  (headers and criteria markers) is applied — semantic rewriting stays
  the agent's job (ADR 0005, ADR 0007).

- A full EARS grammar parser inside `validate`; v0 ships
  section-shape checks (When/While/Where/shall placement), not a
  complete grammar.

- An interactive TUI mode; v0 ships readline prompts only.

- Project scaffolding and maintenance (`init`, `adapter`,
  `templates`, `hooks`, `index`, `upgrade`, `watch`, `metrics`,
  `completion`) — covered by the `scaffolding` capability spec.
