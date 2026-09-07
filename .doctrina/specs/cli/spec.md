# Spec — Command-Line Interface

**Capability:** cli
**Status:** active
**Implementation:** implemented
**Realizes:** n/a — internal framework capability; product success criteria measure adopting-team outcomes, not the tool's own surface
**Last updated:** 2026-08-06
**Version:** 0.40.0

## Purpose

Define the `doctrina` command surface, the conventions every command
honours, the implementation constraints the package follows, and the
exit-code contract. The canonical operation catalog is `OPERATIONS` in
`packages/doctrina-cli/src/lib/commands.js` — the single place the
surface is named; `--help` is generated from it, and drift tests hold
it equal to the dispatch table, the AGENTS.md hub, and the CLI
reference docs (EN and PT). Gate and read-path command semantics are
specified in the `gates` and `insight` capability specs, and the
commands that author artifacts in the tree in the `authoring` spec;
this spec owns the surface itself — the executable, its flags, its
exit codes, its output envelope and the cross-cutting doors every
command shares (git, the lexicon, the usage log).

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

- The system shall define in one module the vocabulary it reads natural language with — how text is folded, which words carry no signal, and how strongly a document answers a query — and every command that ranks or classifies text shall read it from there.

### Event-driven

- When the user invokes an unknown top-level command or
  subcommand, the system shall suggest the closest match by edit
  distance when one exists within a threshold of three.

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

- When a spec declares a `**Depends on:** <caps>` header, the system shall
  record the capability list in the index, show the graph in `doctrina why`
  (both directions), pull the dependency specs into `doctrina context
  <cap>`, and flag dependents of touched capabilities in `doctrina review`
  (ADR 0014).

- When `doctrina close`, `doctrina change apply`, `doctrina change archive`, or `doctrina change check` receive multiple ids, the system shall run each id independently and exit with the worst per-id result.

- When `doctrina close` runs, the system shall print an advisory ADR checkpoint (accepted ADRs whose text cites the touched capabilities, with the amend commands) after analyze, and an advisory `skill suggest` listing after validate; neither shall block the close.

- When `doctrina clarify` runs with `--lang pt` or `--lang en`, the system shall apply that lexicon regardless of the project config and the per-file stopword heuristic.

- When `doctrina validate` finds an open change's delta whose `**Operation:**` header is missing or not one of ADDED, MODIFIED, or REMOVED, the system shall warn, naming the file and the fix.

- When `doctrina analyze` finds `tasks.md` still carrying a scaffold placeholder task (`- [ ]` with no text, checked or not), the system shall fail, telling the operator to plan the change before implementing; `change check` and `close` inherit the refusal.

- When `doctrina validate` finds an open change whose `tasks.md` still carries scaffold placeholder tasks, the system shall warn that the change was opened but never planned.

- When a command cannot run because the project is not set up, the system shall exit with the precondition class and name the setup command that clears it.

- When a history-reading command runs where there is no history, the system shall report that there is nothing to measure and exit successfully, rather than surfacing a git plumbing error.

- When a command with no structured payload of its own runs with the JSON flag, the system shall return its human output as string arrays inside the versioned envelope, with terminal colour removed.

- When the declared verification checks run, the system shall run the typecheck first, before the test suite.

- When recording a usage sample fails for any reason, the system shall continue and report the command's own result unchanged.

- When `doctrina metrics --commands` runs, the system shall report the operations invoked and the catalog operations never invoked in that sample.

- When `doctrina context --for "<task>"` runs, the system shall rank on-demand skills by the task's match against their trigger and mark the ones that match.

- When `doctrina next` runs, the system shall compute the recommended actions as records carrying a stable kind id, the operation and its arguments, the reason, the gate it clears, a severity, and whether it may be run unattended, and shall derive the printed line from those same fields.

- When `doctrina next --run` runs, the system shall execute the first runnable action in process and stop, exiting with that command's own code; when no action is runnable it shall name the action that requires a person and exit successfully.

- When two surfaces rank the same text, the system shall rank it identically, deriving any single score from the same relevance it orders by rather than computing a second one.

- When a caller asks which files changed, the system shall distinguish an empty answer from an inability to answer, and shall let the caller choose whether untracked files and a branch's earlier commits count.

- When a period is reported, the system shall aggregate the recorded lanes and count a change with no recorded lane as unknown rather than assigning it one.

### State-driven

- While a destination file already exists, the system shall refuse to
  overwrite it unless `--force` is supplied.

- While the current working directory does not contain `.doctrina/`,
  every command except `init`, `--help`, and `--version` shall exit
  with a clear error.

### Unwanted-behavior (must-not)

- The system shall not depend on any package outside the Node.js
  standard library at runtime.

- The system shall not write outside the project working directory.

- The system shall not emit telemetry or make network calls.

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
7. [verified] Every command declares a flag spec, every flag read is declared, and every flag documented in an Options block is declared — verified by `packages/doctrina-cli/test/flag-catalog.test.js`.
8. [verified] A declared flag placed before the positionals behaves identically to one placed after — verified by `packages/doctrina-cli/test/flag-catalog.test.js`.
9. [verified] A representative failure of each class returns its documented code, and the top-level help prints the contract — verified by `packages/doctrina-cli/test/exit-codes.test.js`.
10. [verified] Every literal exit return in a command module maps to a documented class — verified by `packages/doctrina-cli/test/exit-codes.test.js`.
11. [verified] Every history-reading command runs cleanly on a repository with no commits and on a directory that is not a repository, leaking no git plumbing — verified by `packages/doctrina-cli/test/integration.test.js`.
12. [verified] `change abandon` without confirmation deletes nothing and names the non-interactive escape; `init` without a description scaffolds nothing — verified by `packages/doctrina-cli/test/integration.test.js`.
13. [verified] No mutating command alters authored `AGENTS.md` or `product.md` content, and `intent add`, whose contract is to append an anchor, preserves every authored line — verified by `packages/doctrina-cli/test/integration.test.js`.
14. [verified] Every command declares the JSON flag and emits parseable output carrying the schema version, the command, and the exit code — verified by `packages/doctrina-cli/test/json-output.test.js`.
15. [verified] The envelope's success flag and exit code agree with the process exit status, and JSON output carries no ANSI escapes even when colour is forced — verified by `packages/doctrina-cli/test/json-output.test.js`.
16. [verified] `tsc --noEmit` reports zero errors across every file under `packages/doctrina-cli/src/` and `scripts/` — run by `doctrina verify` and by CI.
17. [verified] Every source file under `src/` carries `// @ts-check`, so the file stays checked in an editor that does not load the project tsconfig — `packages/doctrina-cli/test/typecheck.test.js`.
18. [verified] The published tarball contains no TypeScript configuration or type declarations, and the package declares no runtime dependencies — `packages/doctrina-cli/package.json`.
19. [verified] No usage file appears unless DOCTRINA_USAGE_LOG names one, and no argument, path, id or prompt reaches the log — `packages/doctrina-cli/test/usage.test.js`.
20. [verified] An unwritable log target does not throw and does not change the command's exit code — `packages/doctrina-cli/test/usage.test.js`.
21. [verified] A sub-operation is recorded only when the catalog carries it, so a capability argument is not mistaken for one — `packages/doctrina-cli/test/usage.test.js`.
22. [verified] An action carries the operation and its arguments, so a consumer re-issues it without parsing prose — verified by `packages/doctrina-cli/test/actions.test.js`.
23. [verified] The lines printed by `next`, `prime` and `handoff` are unchanged by the move to records — verified by `packages/doctrina-cli/test/actions.test.js`.
24. [verified] `--run` executes a runnable action and refuses one that needs a person, ticking and accepting nothing on the way past — verified by `packages/doctrina-cli/test/actions.test.js`.
25. [verified] No module outside the git door invokes git, and no module outside the lexicon carries a second stop list or fix-shaped pattern — verified by `packages/doctrina-cli/test/one-door.test.js`.
26. [verified] The changed-files door reports a clean tree and an unanswerable question differently, and its merge-base option is what makes a branch's earlier commits count — verified by `packages/doctrina-cli/test/one-door.test.js`.
27. [verified] `work` and `context --for` choose the same capability for the same prompt, in either language, with accents folded — verified by `packages/doctrina-cli/test/one-door.test.js`.
28. [verified] Relevance is a tuple and the score is its projection, so a long document cannot out-rank a focused one on volume — verified by `packages/doctrina-cli/test/one-door.test.js`.

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

- The commands that author and advance artifacts inside a project
  (`intake`, `work`, `spec`, `change`, `decision`, `contract`, `skill`,
  `intent`, `triage`) — covered by the `authoring` capability spec, split
  out of this one when it crossed the 400-line cap a third time.
