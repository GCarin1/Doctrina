# Spec — Command-Line Interface

**Capability:** cli
**Status:** active
**Implementation:** implemented
**Realizes:** n/a — internal framework capability; product success criteria measure adopting-team outcomes, not the tool's own surface
**Source:** `packages/doctrina-cli/src/index.js`, `packages/doctrina-cli/src/commands/next.js`, `packages/doctrina-cli/src/lib/{commands,args,flag-catalog,exit-codes,json-out,colors,suggest,version,project,prompt,actions}.js`
**Last updated:** 2026-09-11
**Version:** 0.49.0

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
- The system shall declare each deprecated operation in one place with the command that replaces it, the reason, and the version from which it is deprecated, and shall keep the deprecated name working until a later release removes it.
- The system shall emit a JSON envelope whose `ok` and `exit_code` are derived from the code the command actually returns, so a consumer branching on the payload reaches the same verdict as one branching on the process.
- The system shall capture, into the `--json` envelope, every line a command writes to the process's standard error stream as well as to the console, with carriage returns stripped, so that the envelope carries what the terminal showed and standard output stays pure JSON.
- The system shall name the invoked operation alone in the JSON envelope's command field, carrying any arguments separately, so a consumer branches on one stable value.

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
- When a deprecated operation is invoked, the system shall run it and warn once on the error stream, naming the replacement, so that a caller reading standard output receives exactly what it received before.
- When a superseded command name is invoked with `--json`, the system shall include the replacement command, the version from which the old name is legacy, and the reason in the JSON envelope, in addition to the notice it writes to standard error.
- When `doctrina next` runs, the system shall recommend an action for every gate signal the diagnostic reports — uncovered or dangling acceptance criteria, unrealized product intent, an undeclared build gate, and an active spec whose implementation is still planned — computed from the same collection the read-only views render.
- When a refused flag is a near miss for one the command declares, the system shall name the declared flag as a suggestion, and shall still print the command's help when the help flag is present alongside it.
- When a command is given a reference that does not resolve — a capability, a change id, an ADR number, a requirement or an acceptance criterion — the system shall report the usage class and name the reference, because the invocation is what has to change.
- When `close` is given a change id that does not resolve, the system shall refuse with the usage class before sequencing any step, as every other command that takes a change id does.
- When an invocation is refused for an undeclared flag and JSON output was requested, the system shall emit the envelope reporting the refusal and its exit code rather than an empty payload.

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
- The system shall not list a deprecated operation in the generated command-surface block, and shall not report its absence from that block as documentation drift.
- The system shall not add a deprecation field to the envelope of a command that is not superseded, and shall not alter the standard output of a superseded command.
- The system shall not recommend a gate action for a project that declares no capability yet, and shall not offer the hand-authoring commands as the way to start work.
- The system shall not silently ignore a flag a command has not declared; it shall refuse the invocation, name the flag, and exit with the usage class, so a gate can never report a verdict for a mode it was not asked to run in.
- The system shall not write a JSON envelope before the command's exit code is known, because a call site that emits ahead of its own return can only guess the verdict.
- The system shall not report a reference that does not resolve with the class reserved for a failed gate, and shall not report it as success.
- The system shall not refuse a view that found nothing; a listing or a search with no result shall say so and exit successfully.
- The system shall not end a run in a way that discards output it has already printed; a command's bytes shall reach stdout before the process exits, whether stdout is a terminal, a file, or a pipe.

### Optional

- Where the output is connected to a TTY and `NO_COLOR` is not set, the
  system may emit ANSI colour codes; otherwise output shall be plain
  text.

- Where the user supplies `--non-interactive`, the system may exit with
  an error rather than prompting for missing required values.

## Exit codes


| Code | Class | Meaning |
|------|-------|---------|
| 0 | OK | Success, including validation with warnings only, and a view that found nothing |
| 1 | GATE | A gate measured the work and refused it |
| 2 | USAGE | Unknown command, missing or malformed argument, or a reference that does not resolve |
| 3 | PRECONDITION | The project is not set up for this yet; the error names the command that clears it |
| 4 | ENVIRONMENT | The environment cannot run this; no retry helps |

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
16. [verified] `tsc --noEmit` reports zero errors across every file under the CLI source and `scripts/` — run by `doctrina verify` and by CI — verified by `packages/doctrina-cli/test/typecheck.test.js`.
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
29. [verified] A deprecated command runs, warns on stderr only, and is absent from the surface block; every deprecation names a replacement that exists and is not itself deprecated — verified by `packages/doctrina-cli/test/deprecation.test.js`, `packages/doctrina-cli/test/commands.test.js`.
30. [verified] A superseded command and a superseded two-word operation both carry `deprecated` in the envelope, a command that is not superseded has no such key at all, and the captured stdout is exactly the human output — verified by `packages/doctrina-cli/test/deprecation.test.js`.
31. [verified] On a tree where `doctor` warns, `next` recommends over the same signals; the remedy each new action names clears its own finding; a project with no capability is sent to `intake`; and the snapshot still collects the tree once — verified by `packages/doctrina-cli/test/next-reads-the-gates.test.js`.
32. [verified] On a tree where `coverage --strict` exits 1, `coverage --stricts` exits with the usage class and prints no verdict, naming the flag and suggesting the declared one — verified by `packages/doctrina-cli/test/an-unknown-flag-is-refused.test.js`.
33. [verified] Every flag every command declares is still accepted, an undeclared one is refused on every command, and a flag's VALUE is never mistaken for a flag — verified by `packages/doctrina-cli/test/an-unknown-flag-is-refused.test.js`.
34. [verified] A failing gate reports `ok: false` and the process's own code in its payload, and a passing one still reports success — verified by `packages/doctrina-cli/test/the-envelope-tells-the-truth.test.js`.
35. [verified] The captured path is unchanged and every payload keeps its own data fields and schema version — verified by `packages/doctrina-cli/test/the-envelope-tells-the-truth.test.js`.
36. [verified] A reference that does not resolve costs the usage class in every command that takes one, and a capability an open change is staging a delta for is not one — verified by `packages/doctrina-cli/test/the-exit-contract-holds.test.js`.
37. [verified] No view refuses when it finds nothing, and no class that was already right — success, a gate that measured and failed, a malformed invocation — moved — verified by `packages/doctrina-cli/test/the-exit-contract-holds.test.js`.
38. [verified] `close 0099` exits 2 without sequencing a step; `verify --json` with a check that writes to stderr yields pure JSON on stdout and an envelope carrying those lines without `\r`; `change tick <id> abc` names the argument — verified by `packages/doctrina-cli/test/the-stragglers-of-the-exit-contract.test.js`.
39. [verified] An argument lands in `args` and never in `command`, and a sub-operation stays whole with no `args` key — verified by `packages/doctrina-cli/test/the-envelope-names-the-operation.test.js`.
40. [verified] An unknown flag with the JSON flag emits an envelope carrying `ok: false`, the usage exit code and what it refused — verified by `packages/doctrina-cli/test/the-envelope-names-the-operation.test.js`.
41. [verified] A long `--concat` pack arrives whole through a pipe, byte for byte identical to the same pack written to a file, and the entrypoint sets an exit code rather than calling `process.exit` — verified by `packages/doctrina-cli/test/the-output-survives-the-exit.test.js`.

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
