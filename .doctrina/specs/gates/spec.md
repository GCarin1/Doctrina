# Spec — Quality Gates and Insight Commands

**Capability:** gates
**Status:** active
**Implementation:** implemented
**Realizes:** n/a — internal framework capability; product success criteria measure adopting-team outcomes, not the tool's own surface
**Last updated:** 2026-08-06
**Version:** 1.8.0

## Purpose

Define the semantics of the GATE commands: the checks that decide whether
the artifact tree is honest (`validate`, `coverage`, `trace`, `review`,
`verify`, `analyze`, `clarify`), and the drivers that sequence them
(`close`, `doctor`, the emitted CI pipeline). A gate reads the tree in
order to refuse.

Split out of the `cli` spec when that spec crossed its own 400-line cap,
and split again when this one did: the read-only half — context assembly
and the commands that render state without judging it — moved to the
`insight` spec. The `cli` spec keeps the command surface,
scaffolding/workflow commands, and the surface-wide constraints (exit
codes, zero-deps, no-network).

## Requirements (EARS)

### Ubiquitous

- The system shall keep every gate deterministic: gates check structure
  and cited evidence, and shall leave semantic fidelity judgement to
  the executing agent or human (ADR 0005).
- The system shall treat `verify` as the build gate and `validate` as
  the structural gate; the shipped pre-commit hook runs only the
  latter.
- The system shall declare in one place which gates guard which lifecycle transition and which steps make up each gate sequence, and every command or pipeline that drives one shall render that declaration rather than carrying its own list.
- The system shall declare every dependency a gate needs, and its automation shall install them from the lockfile before running the gate.
- The system shall check the runtime surface only as the project declares it in a contract, and shall never parse a specific CI system, test runner, or language.
- The system shall report a project whose contracts declare no wiring or selector rows as having an UNCHECKED runtime surface, and shall not report it as passing.
- The system shall stream the output of a check declaring an output expectation as it arrives, while accumulating a copy for the match — reading a check's output shall not withhold it.
- The system shall derive a capability's implementation state from its acceptance-criteria coverage — every criterion proven yields verified, some proven yields partial, none yields planned — and every surface that reports or applies that state shall read the same derivation.
- The system shall report a sign-off it cannot hold to the code — one carrying no commit, covering no declared path, or made outside a repository — as unverifiable rather than passing, and shall distinguish executed proof from signed proof wherever it reports the build gate.
- The system shall read and write the archive ledger through one grammar, so that a line the CLI appends is a line the CLI can read back.

### Event-driven

- When `doctrina analyze <change-id>` runs, the system shall
  inspect the change folder at `.doctrina/changes/<change-id>/`
  and report on: proposal.md presence and presence of a "## Why"
  section; tasks.md presence and presence of at least one
  unchecked `[ ]` task; design.md presence (informational); each
  spec delta's Operation header validity and target spec path
  resolution. Exit 0 when no `✗` lines, 1 otherwise. The command
  does not modify any files.
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
- When `doctrina clarify --all` runs, the system shall scan every
  living document — `product.md`, capability specs, open changes,
  and skills — in one pass and exit 1 when any smell is found.
  ADRs and the change archive shall be excluded.
- When `doctrina clarify` scans a file, the system shall pick the smell
  lexicon by language — the project-declared `.doctrina/config.json`
  `"language"` wins, else a per-file stopword count decides — and in
  Portuguese mode shall not flag the English false positives (bare `TODO`
  is the pronoun; only `TODO:` is a marker) while flagging the PT lexicon
  (`talvez`, `provavelmente`, `vários`, ...); a line carrying
  `<!-- clarify:ok -->` shall never be flagged (author-accepted; ADR 0014).
- When `doctrina coverage` classifies a criterion in a spec that declares a
  deliberate deferral (`Implementation: planned — <note>`, the same escape
  hatch `validate` honours), the system shall report it as `deferred` —
  visible in report and JSON output, never a `--strict` failure; with
  `--only <cap,cap>` the report/gate shall be scoped to those capabilities,
  and with `--run` the system shall execute each unique resolving cited
  test file through the project-declared `evidence_runner` command template
  (`{file}` placeholder) from `.doctrina/verify.json`, exiting 1 when any
  run fails or no runner is declared (ADR 0014).
- When `doctrina close <id>` gates coverage, the system shall scope it to
  the capabilities the change's deltas touch (falling back to the whole
  tree for a delta-less change), so a declared deferral elsewhere cannot
  block an unrelated close (ADR 0014).
- When `doctrina validate` runs and `.doctrina/rules.json` exists, the
  system shall enforce each rule — a forbid-regex over glob-scoped paths —
  as an error carrying the rule's own message, capped per rule to keep a
  mass violation readable; an invalid rules file shall be a single error
  (ADR 0014).
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
- When `doctrina validate` runs against a capability spec whose `Status` is
  `active` and which is on the implementation axis (has an `Implementation`
  header) but declares no `Realizes:` header, the system shall warn that the
  capability traces to no product intent — silenced by any `Realizes:` value,
  including a deliberate `n/a — <why>` (provenance-adoption nudge; warnings
  only).
- When `doctrina validate` runs, the system shall parse each
  capability spec and ADR for Markdown link targets, and shall
  emit a warning for any path token that looks like a
  repository-relative file path and does not exist on disk.
  URLs, anchors, wildcards, placeholder patterns, folder-style
  paths (ending with `/`), and backtick spans are excluded.
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
- When `doctrina validate` runs, the system shall walk
  `.doctrina/skills/` and emit a warning for any skill missing
  one or more of the required frontmatter fields (`name`,
  `description`, `when`), any skill over the 200-line cap, and
  any skill whose `name:` field does not match its filename
  slug.
- When `doctrina validate` runs, the system shall additionally warn when
  a capability spec is `Status: active` with `Implementation: planned` and
  no note; when an ADR's `Evidence:` cites a missing path or an accepted
  ADR cites none; and when a contract file is absent from the index; and
  shall fail when `LEDGER.md` and `index.json.changes_archive` disagree.
- When `doctrina validate` runs, the system shall compare the doctrina
  commands documented in `AGENTS.md` against the real CLI surface and warn
  when AGENTS.md references a command that does not exist, and — for an
  AGENTS.md that documents a command catalog and does not defer to
  `doctrina --help` — when it omits commands the CLI ships (hub-freshness;
  warnings only).
- When `doctrina validate` runs against an acceptance criterion marked
  `[verified]` that cites no proof path (read across continuation lines so a
  proof on a later line still counts), the system shall warn that the
  criterion is self-certified (honest gates, ADR 0008; warnings only).
- When `doctrina validate` runs in a project holding both `docs/en/` and
  `docs/pt/`, the system shall warn for any Markdown file present in one
  language tree and missing from the other (translation parity, both
  directions; warnings only — projects without both trees are exempt).
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
- When a `verify.json` check declares `"type": "manual"`, the system shall not run a command for it but treat it as a qualitative gate whose sign-off records the commit it was made at and the paths the check declares it covers; it passes only while none of those paths has changed since, and is otherwise reported as pending, expired, or unverifiable — non-blocking by default, failing under `--strict`. `doctrina verify --signoff "<name>=<note>"` shall record such a sign-off for a declared manual check and exit (review 2026-06-27).
  not run a command for it but treat it as a qualitative gate: it passes
  when signed off (recorded in `.doctrina/verify.signoffs.json`) and is
  otherwise reported as pending — non-blocking by default, failing only
  under `--strict`. `doctrina verify --signoff "<name>=<note>"` shall record
  today's sign-off for a declared manual check and exit (review 2026-06-27).
- When `doctrina verify --clean` runs, the system shall not execute the
  configured checks but instead lint the project's `package.json` files
  for reproducibility footguns — an entry point under a build-output dir
  with no `prepare`/`prepack`, and a Prisma dependency with no
  `postinstall`/`prepare` generate step — exiting 1 on any risk and 0 when
  clean, so "verify green" cannot hide a clean checkout that won't build
  (ADR 0008).
- When `doctrina review` runs, the system shall report structural
  conformance breaks between the working tree (or `--diff <ref>`) and the
  spec/ADR/contract tree — code changed under a capability whose spec was
  not updated, changed code mapping to no capability, acceptance criteria
  citing missing proof, dropped product intent, and contract collisions —
  exiting 0 as a report and 1 under `--strict` when any hard break exists;
  it never judges semantic fidelity (review 2026-06-27).
- When `doctrina close <id>` runs, the system shall drive the closing sequence in one pass — analyze → review (advisory) → change apply → runtime → verify (skipped with a note when no `verify.json`) → coverage `--strict` → trace (advisory) → change archive → validate — stopping at the first failure with the exact command to rerun, and exit non-zero on that failure (review 2026-06-27).
  sequence in one pass — analyze → change apply → verify (skipped with a
  note when no `verify.json`) → coverage `--strict` → trace (advisory) →
  change archive → validate — stopping at the first failure with the exact
  command to rerun, and exit non-zero on that failure (review 2026-06-27).
- When `doctrina doctor` runs, the system shall drive the diagnostic set — the structural checks, the index drift check, the coverage/trace ratios, the clean-checkout lint, the template shape, the runtime surface, and the verify-config presence — by reading each as a collection IN THE SAME PROCESS, reporting each area with its exact remediation command, adding no checks of its own, and exiting 1 when any area fails (advisory findings stay exit 0).
  set — `validate` (machine-read), the index drift check, the
  coverage/trace ratios, `verify --clean`, `templates check`, and the
  verify-config presence — reporting each area with its exact
  remediation command, adding no checks of its own, and exit 1 when
  any area fails (advisory findings stay exit 0).
- When `doctrina status`, `validate`, `coverage`, or `trace` runs with
  `--json`, the system shall emit the same data the human rendering
  shows as JSON with a stable shape, while preserving the command's
  exit semantics.
- When `doctrina close` runs on a change that alters a documented surface — a command, a flag, or an exit code named in the change's own proposal or deltas — the system shall refuse to close unless the same work also touches `docs/` or a README, and `--force` shall close anyway and record the gap in the archive ledger.
- When `doctrina doctor` reports the template row, the system shall describe the actual findings and name the remedy those findings carry, rather than assuming a missing recommended section.
- When `doctrina change apply` runs on a change whose structural checks fail, the system shall refuse, name the blocking gate and the command that clears it, and write nothing.
- When a lifecycle transition is forced with `--force`, the system shall proceed past the precondition, name the waived blockers, and record the gap in the archive ledger, creating the ledger when it does not yet exist.
- When `doctrina contract check` runs, the system shall verify each declared wiring row against the named workflow, report a variable no env: block exports as an error, and report an origin or name mismatch between the contract and the workflow.
- When a declared variable's origin is one a CI provider can inject as an empty string, the system shall lint the declared consumer for a default that applies only when the variable is absent, and shall state in the finding that the check is textual.
- When a contract declares a Values enum, the system shall report an `.env.example` value outside that set as an error and a consumer that mentions no member of it as a warning.
- When a contract declares a selector, the system shall extract candidates from the declared source glob using the declared pattern and report a selector matching zero targets as an error, naming a near-miss when only the separator differs.
- When a verify check declares an output expectation, the system shall read that check's output and fail the check when the output matches a declared failure pattern or fails to match a declared required pattern, even though the command exited zero.
- When a verify check declares an output expectation that is not a valid regular expression, the system shall fail at configuration time with the usage exit code rather than skipping the expectation.
- When an acceptance criterion is marked `[orchestration]`, the system shall treat it as covered only when it cites a verify check that declares an output expectation, and shall report it as unguarded otherwise.
- When `doctrina analyze <change-id>` runs, the system shall refuse a change whose text raises a declared OUTPUT budget above the ceiling its contract records.
- When `doctrina validate --runtime` runs, the system shall run the same runtime checks as `contract check` in addition to the structural checks, and shall report their errors as validation errors.
- When `doctrina doctor` runs, the system shall report the runtime surface as one further diagnostic row, and with `--env` shall additionally check the local `.env` against the declared names and enums.
- When `doctrina close <id>` reaches the runtime gate, the system shall evaluate the same runtime checks `contract check` renders and refuse the close when any finding is an error, while reporting a finding that is only a warning and continuing.
- When the shipped CI action runs, the system shall run the declared runtime checks as one of its gate steps, so a declaration that no longer holds fails the pipeline instead of passing it.
- When a gate sequence is rendered by a surface, the system shall take the steps, their order, and each step's level from the declaration, and shall run a declared step that the surface binds no handler to by invoking the command the declaration names.
- When `doctrina ci --emit <target>` runs, the system shall write the CI pipeline for the declared sequence to stdout, exiting with the usage code for an unknown or missing target, and shall write no file of its own.
- When a spec's written implementation state disagrees with the state its coverage supports, the system shall warn and name the operation that settles it, unless the written state carries an explanatory note or understates by exactly the uncertified rung.
- When `doctrina close <id>` reaches the implementation step, the system shall report the derived state for each capability the change touched and print the header operation that would apply it.
- When `doctrina spec set <cap> --implementation auto` runs, the system shall write the derived state, and shall refuse without writing when the spec declares no acceptance criteria to derive from.
- When `doctrina close <id>` reaches the review step, the system shall report the conformance breaks between the change and the spec tree before applying any delta, so a finding can still change what is written.
- When a check is rendered by one command and reported by another, the system shall express it once as a collection under `lib/` and let both read it, so that no command starts a second process to ask a question this one can answer.
- When `doctrina report` runs, the system shall report how many archived changes touched each capability in the period, from the archive ledger rather than from the file history, and shall report the count without a verdict on it.
- When `doctrina review` runs, the system shall note how many changes each touched capability has landed in a recent window, as history rather than as a finding.
- When `doctrina close` runs the coverage gate, the system shall additionally report the capabilities that declare a dependency on the ones this change touched, with their coverage, without widening the gate to them.
- When `contract check` finishes with no error, the system shall report in its summary line how many contracts declared no Wiring or Selectors rows, and shall exit 0.
- When no acceptance criterion is declared, the system shall report coverage as absent rather than as a percentage, and every view shall render that absence identically.
- When the documentation gate refuses a change, the system shall name the documentation locations the checked project itself has, and shall name no path or procedure that exists only in Doctrina's own repository.
- When a step declared in a gate sequence has no runner in the driver executing it, the system shall report that step as unimplemented and name the command that answers it, in every driver alike.
- When deciding whether a change must carry documentation, the system shall recognise as documented surface the names the checked project declares in its own contracts, and shall fall back to its own command catalog only for a project that declares none.
- When a change names a route, an HTTP method with a route, or an environment-variable identifier in a code span, the system shall treat it as documented surface even when no contract declares it yet.

### State-driven


### Unwanted-behavior (must-not)

- The gate commands shall not modify any file, with two documented
  exceptions: `validate --fix` regenerates `.doctrina/index.json` from
  the tree, and `verify --signoff` records a sign-off in
  `.doctrina/verify.signoffs.json`.
- The gates shall not certify semantic fidelity; a green gate means the
  structure and the cited evidence hold, never that the prose is true
  (ADR 0005, ADR 0008).
- The system shall not raise the documentation gate from the scaffolded boilerplate of a change; only content the author wrote counts as a documented-surface signal.
- The system shall not raise the documentation gate outside a git repository, where it cannot tell what moved.
- The system shall not evaluate a gate at a transition where its question is not meaningful; the structural gate asks whether a change is safe to apply, so archiving shall not re-ask it.
- The system shall not pass a change whose proposal carries a section holding only its scaffold comment; a heading that survived is not a section that was written.
- The system shall not invoke a gate through a resolver that installs a missing package from a registry; a gate whose tool is absent shall fail loudly rather than run something fetched in its place.
- The system shall not print the value of an environment variable when reporting a local `.env` finding; it shall name the variable and the allowed set only.
- The system shall not report a workflow it cannot read as one that omits a declared variable; it shall report the file as unreadable instead.
- The system shall not let a surface invent, drop, or reorder a step of a declared gate sequence.
- The system shall not rewrite an implementation header from a gate; a derived state shall be proposed and applied only by an explicit command.
- The system shall not infer which paths a manual check covers; an undeclared coverage shall make the sign-off unverifiable rather than assumed.
- The system shall not let an advisory step decide a driver's exit code; a step declared advisory shall report and the sequence shall continue.
- The system shall not report a diagnostic row by running its own binary and parsing that output, and shall not repair the tree from a read-only diagnostic; a declared row with no reporter shall be reported unchecked, never silently skipped.
- The system shall not fail, rewrite, or discard a ledger line a human wrote outside the entry grammar; it shall skip it and keep reading.
- The system shall not derive a documented-surface signal from text inside an HTML comment when deciding whether a change must carry documentation.
- The system shall not describe a contract set as consistent in the summary of `contract check` when no Wiring or Selectors row was declared to check.
- The system shall not treat a metadata header whose value is still the shipped template's placeholder as a header the author supplied.
- The system shall not run its own binary as a subprocess to satisfy a step of a sequence it is already executing.
- The system shall not offer, as a place to write documentation, a directory of the checked project that contains no prose.

### Optional

- Where a wiring row declares its source as `<origin>:<source>`, the system may treat an export reading that source as intended and report no name mismatch, while still reporting an origin mismatch as an error.

## Acceptance criteria

The gate surface is spec-compliant when:

1. [verified] Every gate command listed under "Event-driven" runs and
   produces the documented effect — proven by
   `packages/doctrina-cli/test/integration.test.js`.
2. [verified] `doctrina validate` exits 0 against this repository's own
   `.doctrina/` tree (self-check) — implemented in
   `packages/doctrina-cli/src/commands/validate.js`.
3. [verified] `doctrina coverage --strict` and `doctrina trace --strict`
   exit 0 against this repository — the gates hold on the framework
   itself; see `packages/doctrina-cli/src/commands/coverage.js` and
   `packages/doctrina-cli/src/commands/trace.js`.
4. [verified] The hub-drift and self-certified-criterion gates are
   regression-tested — `packages/doctrina-cli/test/commands.test.js`.
5. [verified] A change altering a documented surface with no accompanying documentation is refused by `doctrina close`, closes under `--force`, and the gap is written to the ledger — verified by `packages/doctrina-cli/test/integration.test.js`.
6. [verified] Scaffold boilerplate raises no documentation signal, so the gate stays quiet on a change that touches no documented surface — verified by `packages/doctrina-cli/test/docs-impact.test.js`, `packages/doctrina-cli/test/integration.test.js`.
7. [verified] An adapter-pointer finding is reported by `doctor` with the remedy that resolves it, and is not labelled a missing section — verified by `packages/doctrina-cli/test/remedies.test.js`.
8. [verified] Every lifecycle transition is guarded identically regardless of which command drives it, enumerated by a table-driven suite — verified by `packages/doctrina-cli/test/gate-parity.test.js`.
9. [verified] A refused transition mutates nothing, and a forced one records the waived blockers in the ledger — verified by `packages/doctrina-cli/test/gate-parity.test.js`.
10. [verified] A freshly scaffolded change fails analyze naming each unwritten section, and passes once they carry prose — `packages/doctrina-cli/test/integration.test.js`.
11. [verified] The test suite passes on a checkout with no node_modules, skipping the typecheck rather than fetching a compiler — `packages/doctrina-cli/test/typecheck.test.js`.
12. [verified] No workflow or verification check invokes a gate tool through `npx` — `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `.doctrina/verify.json`.
13. [verified] A declared wiring row whose workflow exports nothing fails `contract check` with RT01, and passes once the env: line exists — verified by `packages/doctrina-cli/test/runtime.test.js`.
14. [verified] A consumer default that an empty CI value never triggers is reported (RT03), while an empty-safe form is not — verified by `packages/doctrina-cli/test/runtime.test.js`.
15. [verified] A selector matching zero targets fails with RT05 and names the separator near-miss — verified by `packages/doctrina-cli/test/runtime.test.js`.
16. [verified] A verify check that exits 0 having printed "0 scenarios" fails the gate, and passes once the run is real — verified by `packages/doctrina-cli/test/runtime-commands.test.js`.
17. [verified] An orchestration criterion citing a check with no expect guard is reported unguarded and fails `coverage --strict` — verified by `packages/doctrina-cli/test/orchestration.test.js`.
18. [verified] `analyze` refuses a change that raises a declared output ceiling and stays silent on an input ceiling — verified by `packages/doctrina-cli/test/orchestration.test.js`.
19. [verified] `doctor --env` reports enum membership without the offending value appearing in its output — verified by `packages/doctrina-cli/test/runtime.test.js`.
20. [verified] A wiring row declaring `<origin>:<source>` silences the name-mismatch warning while the workflow agrees, and warns again when either side moves — verified by `packages/doctrina-cli/test/runtime.test.js`.
21. [verified] Declaring a source does not switch off the empty-vs-unset check for that row — verified by `packages/doctrina-cli/test/runtime.test.js`.
22. [verified] A check with an output expectation emits its output progressively rather than in one block at the end — verified by `packages/doctrina-cli/test/runtime-commands.test.js`.
23. [verified] A change whose contract declares wiring the named workflow does not export is refused by `doctrina close` at the runtime gate, and the same change closes once the export exists — verified by `packages/doctrina-cli/test/integration.test.js`.
24. [verified] A project with no contracts, and one whose contracts declare no rows, close unchanged — the second reported as unchecked rather than passing — verified by `packages/doctrina-cli/test/integration.test.js`.
25. [verified] The shipped CI action carries the runtime step, and the command it runs exits 1 on the same broken declaration — verified by `packages/doctrina-cli/test/integration.test.js`, `action.yml`.
26. [verified] The close sequence, the doctor rows, and the emitted CI pipeline all derive from the single declaration, and a surface that starts carrying its own copy fails the suite — verified by `packages/doctrina-cli/test/gate-sequences.test.js`.
27. [verified] A step added to the declaration reaches the CI surface with no further edit, in declared order — verified by `packages/doctrina-cli/test/gate-sequences.test.js`.
28. [verified] `doctrina ci --emit github` reproduces the versioned `action.yml` byte for byte, so a stale file fails the build instead of shipping — verified by `packages/doctrina-cli/test/gate-sequences.test.js`, `action.yml`.
29. [verified] The three bands of the derivation, the uncertified-rung exemption, and the explanatory-note escape hatch each behave as declared — verified by `packages/doctrina-cli/test/implementation-derived.test.js`.
30. [verified] A fully proven spec still marked planned is warned about by `validate`, and a half-proven spec claiming verified is warned about in the other direction — verified by `packages/doctrina-cli/test/implementation-derived.test.js`.
31. [verified] `spec set --implementation auto` writes the derived state, refuses a spec with nothing to derive from, and leaves that spec untouched — verified by `packages/doctrina-cli/test/implementation-derived.test.js`.
32. [verified] The close proposes the header op and the spec it reports on is byte-identical afterwards — verified by `packages/doctrina-cli/test/implementation-derived.test.js`.
33. [verified] A signature records what it covers and the commit it covers it at, expires when a covered path changes by commit or by an uncommitted edit, and survives a change elsewhere — verified by `packages/doctrina-cli/test/signoff.test.js`.
34. [verified] A sign-off with no recorded commit, no declared paths, or made outside a repository is reported unverifiable rather than passing, and warned about at signing time — verified by `packages/doctrina-cli/test/signoff.test.js`.
35. [verified] Every non-fresh state is non-blocking by default and fails `--strict`, each manual check falls into exactly one state, and every read-only view and `doctor` report signed proof separately from executed proof — verified by `packages/doctrina-cli/test/signoff.test.js`.
36. [verified] The review runs before the apply, reports a capability whose code moved while its spec stood still, and leaves the close's exit code untouched — verified by `packages/doctrina-cli/test/integration.test.js`, `packages/doctrina-cli/test/gate-sequences.test.js`.
37. [verified] A whole `doctor` run is one CLI invocation — proved by the usage log, which recorded four before this — and its rows agree with the commands that render the same collections — verified by `packages/doctrina-cli/test/doctor-in-process.test.js`.
38. [verified] The ledger of this repository parses in full — abandonments and waived-gate lines included — a hand-written line is skipped rather than fatal, and churn counts only the changes that landed — verified by `packages/doctrina-cli/test/ledger.test.js`.
39. [verified] `report` shows capability churn for the period, `review` reports it as history, and `close` names the dependents of the touched capabilities without gating on them — verified by `packages/doctrina-cli/test/ledger.test.js`.
40. [verified] A change scaffolded on the default path, whose guessed delta names `doctrina work` inside its guess comment, produces no command signal, while a command the author wrote outside a comment still does — verified by `packages/doctrina-cli/test/comment-is-not-content.test.js`.
41. [verified] A scaffolded contract produces a summary that names the unchecked runtime surface and never the word "consistent"; a contract whose declared wiring holds produces both the consistency and the row count; and `contract check`, `doctor` and `triage` describe the same undeclared state the same way — verified by `packages/doctrina-cli/test/runtime-commands.test.js`.
42. [verified] A project whose specs declare no criterion reports "no criteria declared" in `status`, `prime`, `report`, `handoff`, `coverage` and its JSON (`pct: null`), never 100%, while one declared criterion still reports a real ratio — verified by `packages/doctrina-cli/test/absence-is-not-approval.test.js`.
43. [verified] An active spec still carrying the scaffold's `Realizes:` placeholder warns, and a deliberate `n/a — <why>` or a real anchor stays silent — verified by `packages/doctrina-cli/test/absence-is-not-approval.test.js`.
44. [verified] A project with no documentation is pointed at a README rather than at `docs/en` and `docs/pt`, a project with one documentation directory is pointed at that one, and in this repository both languages are still named — verified by `packages/doctrina-cli/test/portable-remediation.test.js`.
45. [verified] Every step the close declares has a runner, the close starts no subprocess of its own binary, and close and doctor describe a runnerless step the same way — verified by `packages/doctrina-cli/test/export-drift.test.js`.
46. [verified] No export under `src/lib/` is referenced by nothing at all, a seam reached only by tests is reported apart from dead surface rather than failed, and a newly orphaned export is caught — verified by `packages/doctrina-cli/test/export-drift.test.js`.
47. [verified] A command, an environment variable and a configuration key an adopting project declares each produce a signal; an endpoint and a variable being added produce one by shape; a purely internal change produces none; and a project with no contract behaves exactly as before — verified by `packages/doctrina-cli/test/docs-gate-reads-the-contract.test.js`.

## Out of scope for this spec

- Context assembly and the read-only commands that render project state —
  `context`, `search`, `show`, `status`, `prime`, `handoff`, `report`,
  `why`, `constitution` (covered by the `insight` spec).
- The command surface, exit-code conventions, and scaffolding/workflow
  commands (covered by the `cli` spec).
- The content of `verify.json` checks — those are project-declared, not
  framework-defined.
- Semantic fidelity judgement of any artifact (ADR 0005).
