# Changelog

All notable changes to Doctrina are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Versioning policy

- `0.x.y` — pre-1.0 development. Public CLI surface and on-disk
  artifact shapes may change between minor versions.
- `1.0.0` — first stable release. After 1.0, breaking changes to
  the CLI surface, the `.doctrina/` layout, the templates
  contract, or `index.json` schema require a major version bump
  and a migration note in this file.
- Patch (`x.y.Z`) bumps are reserved for backward-compatible bug
  fixes and documentation updates.

## [Unreleased]

### Added

- **The runtime gate runs in the close and in CI.** `lib/runtime.js` held
  RT01-RT05 and no default driver executed them: `close` did not run them,
  `validate` only under `--runtime`, and the published action not at all —
  so the one class of break every structural gate is blind to (a contract
  whose declared wiring, enum or selector no longer matches the running
  system) reached a green pipeline. `doctrina close` now runs a `runtime`
  step after `apply`, and `action.yml` runs `doctrina contract check`
  alongside the other gates. No new check and no second implementation:
  the same findings `contract check`, `validate --runtime`, `triage` and
  `doctor` already render.
- Severity decides the level in the close: an `error` blocks, a `warn` is
  reported and the close continues. A project with no contracts prints one
  line and passes; contracts declaring no `Wiring`/`Selectors` rows are
  reported UNCHECKED rather than passing, because silence is the absence of
  a declaration, not proof that the wiring holds.
- `.doctrina/verify.json` gained the matching `contract-check` entry, so the
  local verify set stays equal to what CI runs.
- **One gate map, for sequences as well as transitions.** ADR 0017 promised a
  single declaration of which gates guard what; `lib/gates.js` delivered it
  for `apply`/`archive` and stopped there, while `close` carried an array of
  ten steps, `doctor` eight hand-written rows and `action.yml` its own YAML.
  `SEQUENCES` in `lib/gates.js` now declares all three, naming each step, its
  level (blocking / advisory / forceable) and the command that re-runs it;
  `close` and `doctor` render that declaration instead of their own lists, and
  a step declared with no bound handler still runs, via the command the
  declaration names.
- **`doctrina ci --emit github`** writes the composite action from the same
  declaration. The action stays versioned — a project writing
  `uses: <owner>/<repo>@v1` has no CLI to generate it with — and a drift test
  compares the committed `action.yml` to the emitter byte for byte, so a stale
  pipeline fails the suite instead of shipping.

## [0.15.1] — 2026-09-04

Defects that dogfooding 0.15.0 on this repository surfaced within hours of
shipping it — first in the runtime surface itself, then in the machinery
around it once the surface was in use. No new capability: every item is
something 0.15.0 (or an older release) claimed and did not deliver.

### Fixed

- **RT02 advised a remedy the artifact could not express.** This
  repository's release workflow exports `NODE_AUTH_TOKEN` from
  `secrets.NPM_TOKEN` — a deliberate rename, because the name is npm's.
  `contract check` correctly flagged the risk and then said "record the
  intentional rename in the Wiring row", which was impossible: `Origin`
  was compared exactly against `vars`/`secrets`, so writing
  `secrets:NPM_TOKEN` dropped the row out of the check entirely and took
  RT01 with it. The result was a permanent, unclearable warning — which
  teaches readers to ignore warnings, the opposite of the point.

  `Origin` now accepts `<origin>[:<source>]`. RT02 stays silent while the
  workflow reads the declared source and warns the moment either side
  moves; RT01's remedy quotes the declared source, so the `env:` line it
  tells you to paste is the one that works. A bare origin behaves exactly
  as before, and an **origin** mismatch remains an error either way —
  that one is never intentional.

- **An `expect` guard silenced the check it guarded.** A check declaring
  an output expectation ran with its output captured and echoed only once
  it finished — about forty seconds of blank terminal on this project's
  own suite, and worse on anything slower. Reading a check's output and
  showing it are independent concerns: the run is now teed, streaming to
  the terminal as it arrives while a copy accumulates for the match.
  Checks without an expectation are untouched.

- **Declaring a source no longer disables the empty-vs-unset check.** The
  first cut of the fix read the `Origin` cell raw in `checkEmptySemantics`,
  which would have made `secrets:NPM_TOKEN` fall out of the injectable set
  and silently switch RT03 off for that row — the same defect wearing a
  different hat. Caught by a test written for exactly that.

- **A patch erased its minor's agent-facing summary.** The
  `doctrina:changed` block in AGENTS.md *replaces* its predecessor rather
  than accumulating, and it rendered only the current version's own entry
  — while a test required every shipped version to have one. So any patch
  was forced to write an entry, and writing one wiped the release that
  introduced the commands: an agent upgrading 0.14.0 → 0.15.1 would read
  one bug fix and never learn `triage` exists. The block now renders the
  current **minor series**, newest first, capped at the five bullets the
  150-line AGENTS.md budget allows; a patch lists only its own delta and
  the series carries the rest. Truncation drops the oldest by rule instead
  of by an author quietly cutting a line to fit.

- **`change archive` accepted what `change apply` had just refused.** The
  gate map excluded the whole `structure` gate from `archive`, for a
  correct reason: one of its checks ("an ADDED delta's target must not
  already hold real content") is proof of a problem before an apply and
  proof the apply *worked* after one. But excluding the gate wholesale
  also dropped the hollow-proposal check, which has no such problem — so a
  change refused by `apply` for an unwritten `## What` could be archived
  anyway, and stamped `Status: applied`. Observed on change 0030 of this
  repository, one release after its own history recorded six hollow
  proposals reaching the archive. Structural findings now carry a scope,
  and `archive` requires a new `integrity` gate: every structural question
  except the three that only mean something before an apply.

- **The lane classifier read work *on* the machinery as an incident *in*
  it.** Both misreads came from matching domain nouns as if they were the
  act: "declare the release workflow wiring in a contract" scored RUNTIME
  on *workflow* and *wiring*, and "so an intentional rename stops warning"
  scored CHORE on *rename* — a noun. Authoring verbs (declare, document,
  record, specify, define) now weigh toward the ceremony lane whatever
  nouns surround them. Both real prompts classify correctly, and an actual
  "rename the helper file" is still a chore.

- **Cosmetic:** the runtime row read "1 declared row hold".


## [0.15.0] — 2026-09-03

Field review of 2026-09-03, written by an agent operating Doctrina on a
downstream Behave + GitHub Actions + dotenv repository. Its verdict:
Doctrina is strong as product memory and a scope brake, and weak as
**runtime** guidance. The index assumes truth lives in versioned
Markdown; the operational half never did. It lives in a job's `env:`
block, in an absent `${{ vars.X }}` collapsing to the empty string so a
`getenv(NAME, default)` default silently never applies, in an enum the
contract declares and no code validates, in hook ordering, and in a test
selector that matches zero cases and exits 0. None of that is EARS, so no
gate could see any of it — and `work` was the answer to every request, so
each of those incidents became a change with a proposal, tasks and a spec
delta before anyone read the YAML.

Two decisions frame the release: the runtime surface is **declared, never
inferred** (ADR 0023 — Doctrina learns no CI system, test runner or
language; every check reads a glob, pattern or origin the contract
declares, so SC1's zero-dependency promise and the "not a CI/CD system"
non-goal both hold), and a request is **classified into a lane before it
is scaffolded** (ADR 0024).

### Added

- **`doctrina triage ["<prompt>"]`** — classifies a request as PRODUCT,
  RUNTIME or CHORE before anything is scaffolded, and runs the runtime
  checks with or without a prompt. Deterministic term matching that
  prints the signals it matched: a hint, never a refusal (ADR 0005).
  PRODUCT is the default and must be *beaten*, so an ordinary feature
  request that mentions a "job" is never diverted into a diagnosis.
- **Runtime contract declarations** — the contract artifact gains
  **Wiring** (variable → origin → workflow → job/step → consumer),
  **Selectors** (selector → source glob → pattern → used by) and
  **Budgets** (limit → direction → value) tables, plus a `Values` column
  on Environment. Every section is optional, so contracts written before
  this parse to empty declarations and check exactly as they did.
- **Runtime checks in `contract check`** (also surfaced by `triage`,
  `validate --runtime` and `doctor`, all from one module so they cannot
  disagree):
  - `RT01`/`RT02` — a variable declared with origin `vars`/`secrets` that
    no `env:` block in the named workflow exports, or that the workflow
    reads from a different origin or name. The "I set the secret in
    GitHub and nothing happened" class.
  - `RT03` — a consumer default that only applies when the variable is
    *absent*: CI injects the empty **string**, which is present, so the
    documented default never fires. A textual lint, and the finding says
    so (`getenv(X, d)`, `environ.get(X, d)`, `process.env.X ?? d` — never
    `||`, which is already empty-safe).
  - `RT04` — a declared `Values` enum an `.env.example` violates (error),
    or that the consumer never mentions (warning: an enum nothing
    validates).
  - `RT05` — a declared selector matching zero targets, which makes a
    dispatched run execute 0 cases and still exit 0. Names the near-miss
    when only the separator differs (`smoke-test` vs `smoke_test`).
- **Output expectations in `verify`** — a check may declare
  `"expect": { "fail_if_output_matches": ..., "require_output_matches": ... }`,
  so a run that exits 0 having executed **nothing** fails the gate. The
  project declares the line that proves its run was real; Doctrina
  supplies no patterns and knows no runner. An uncompilable pattern fails
  at config time with exit 2, never silently.
- **Ordered pipeline requirements** — a spec may declare a
  `### Pipeline` block of numbered steps and the artifact each hands on.
  EARS states every event-driven requirement independently and says
  nothing about sequence, so a consumer and its producer both pass while
  the consumer reads the previous run's file. `validate` enforces the
  invariant a numbered list cannot: a step may only require what an
  *earlier* step produced (`PL01`–`PL03`; `(external)` declares an input
  from outside).
- **Orchestration acceptance criteria** — a criterion marked
  `[orchestration]` is proven by a fail-closed **verify check**
  (`` `verify:<name>` ``), not by a resolving citation. A cited check with
  no `expect` guard is reported **unguarded** and fails
  `coverage --strict`: citation is the right proof for "this function
  behaves" and the wrong one for "the pipeline ran at all".
- **`doctrina skill suggest --from-error <text|file>`** — drafts one
  skill from the failure on screen *now*, filling the `when:` trigger
  from the error's own paths, identifiers and distinctive terms. The
  procedure stays the author's to write.
- **`doctor --env` / `triage --env`** — the local `.env` against the
  declared names and enums, reporting membership only. A rejected value
  is **never printed**, so the output is safe to paste.
- **Budget discipline in `analyze`** — a change that resolves an overflow
  by raising a declared **output** ceiling is refused: that buys headroom
  by truncating what mattered. Raising an *input* ceiling stays an
  ordinary trade-off.

### Changed

- **`work` holds a runtime-shaped prompt** before scaffolding anything,
  with exit 3 (a precondition — the work may be fine, it has simply not
  been diagnosed) and points at `triage`. `--force` opens the change
  anyway; `--chore` is the lane for wiring the spec already covers.
- **`next` ranks a broken runtime declaration above every artifact
  chore** — after a job goes green having run nothing, "open a change on
  the observability capability" sent the agent to polish an empty-state
  message while the cause sat in a file no action named.
- **`context --for` ranks on-demand skills** by the task's match against
  their trigger and marks the ones that match. Alphabetical order is the
  wrong order for a list whose job is "fire the right one".
- **`validate`** warns on a skill whose `when:` names nothing concrete —
  a trigger written as prose can never be matched, so the skill is loaded
  only by someone who already knew it existed. `--runtime` folds the
  runtime gate into the structural one.
- **`contract check`** reports a contract with no Wiring or Selectors
  rows as **unchecked**, never as passing: silence is not proof.
- **Table cells now honour escaped pipes** (`\|`), so a declared enum
  like `none\|critical\|serious` survives parsing.


## [0.13.0] — 2026-07-19

Operator-review follow-ups (external agent review of 2026-07-19, written
from ~35 changes of end-to-end operation on a 0.12-era project) plus the
upgrade-fidelity gap. Two structural themes: (1) the MODIFIED delta merge
was still manual for the dominant case — inserting EARS bullets — which
desiccated `close` into a hand-stepped sequence; (2) for an agent,
AGENTS.md **is** the discovery interface, and ~15 commands (`prime`,
`handoff`, `doctor`, `show`, `intent add`, `report`, ...) stayed
invisible for 35 changes because the hub never named them and `upgrade`
never refreshed it (ADR 0015).

### Added

- **EARS requirement ops** — `append-requirement <section>: <text>` and
  `replace-requirement <section> <n>: <text>` in the delta ` ```ops `
  block (sections `ubiquitous|event|state|unwanted|optional`). The verbs
  now cover headers, criteria, and the requirement bullets, so a typical
  MODIFIED delta applies mechanically end to end; `append-*` resolves
  numbering at apply time, so concurrent changes appending to one spec
  cannot collide (review §3.1/§3.6, suggestion #1).
- **CLI-owned AGENTS.md surface block** (ADR 0015) — the command-surface
  section is now a marker-delimited block
  (`<!-- doctrina:surface:begin/end -->`) **generated from the command
  catalog**: `init` writes it fresh, `templates check` flags it stale,
  and `templates update --write` / `doctrina upgrade --write` regenerate
  exactly that span (a legacy hand-written surface section is replaced;
  everything outside the markers keeps the additive-only guarantee).
  Closes the user-reported gap: `upgrade` bumped the stamp but never
  rebuilt AGENTS.md, so agents never discovered new commands.
- `doctrina change check <id...>` — read-only pre-close dry-run: analyze's
  structural checks + every ops block executed in memory against its
  target + the archive-gate preview + an advisory list of accepted ADRs
  citing the touched capabilities (suggestion #4).
- `doctrina change tick <id> [n... | --all]` — list/tick the unchecked
  boxes of tasks.md + the proposal's `## Verification` in one ordinal
  space; the missing checkbox command (suggestion #5).
- **Batch ids** — `close`, `change apply`, `change archive`, and
  `change check` accept multiple ids; each runs independently and the
  worst exit code wins (suggestion #5).
- **ADR checkpoint in `close`** (advisory step after analyze) — names the
  accepted ADRs whose text cites the change's touched capabilities and
  the amend commands; the playbook's "record an ADR" step is no longer
  skippable in silence (suggestion #6).
- **`skill suggest` at the end of `close`** (advisory) — fix-shaped
  lessons not yet captured are surfaced at the moment of closing
  (suggestion #7).
- `doctrina work --capability <cap>` now **scaffolds the delta**
  (`specs/<cap>/delta.md`) with `**Operation:**` prefilled — MODIFIED
  when the spec exists, ADDED when not — killing the
  missing-header-explodes-at-analyze class at the source (§3.2,
  suggestion #2).
- `doctrina work --quiet` — register a backlog change with a one-line
  confirmation instead of the full playbook (§3.7, suggestion #10).
- `doctrina clarify --lang pt|en` — force the lexicon over the config
  and the per-file heuristic (matters on mixed-language files; §3.4,
  suggestion #8).
- `validate` warns on an open change's delta with a missing or malformed
  `**Operation:**` header — the error now appears near the cause, not
  days later at the closing analyze (§3.2).
- **Hollow-change teeth** (user report: the agent runs `work`, leaves the
  scaffolded artifacts empty, and starts implementing with no plan) — an
  empty `- [ ]` scaffold placeholder in tasks.md (checked or not) is now
  a hard `analyze` failure (so `change check` and `close` refuse), a
  `validate` warning on every run ("opened but never planned"), and
  `change tick` refuses to tick a textless box — the gate cannot be
  gamed by ticking placeholders. The work playbook states the order
  explicitly: plan the tasks/proposal BEFORE implementing.
- `templates check` verifies every **installed agent adapter** (CLAUDE.md,
  GEMINI.md, `.cursor/rules/…`, …) still references AGENTS.md. Adapters
  are thin pointers at the hub — that is why a single
  `doctrina upgrade --write` surface refresh reaches every installed
  agent; a broken pointer is now a named finding.

### Changed

- The shipped `AGENTS.md` template's day-to-day guidance now names the
  session bookends (`prime` at session start, `handoff` before
  compaction/handover) and `change check` before `close` (review
  meta-conclusion, suggestion #3).
- `extractOps` ignores ops fences inside HTML comments — the scaffolded
  delta template carries an *example* block in its instructional comment,
  which apply must never execute.
- The work playbook documents the requirement verbs, the
  apply-time-numbering rule for concurrent changes, and a contract nudge
  (ports/env/endpoints → `contract new` / `contract check`).

### Fixed

- `doctrina upgrade --write` now actually brings AGENTS.md up to the
  installed CLI (via the regenerated surface block) instead of only
  migrating the `framework_version` stamp and printing a hint.

## [0.12.0] — 2026-07-12

Field-review follow-ups (external 0.11.0 review, project session of
2026-07-12: 9 changes, 6 new capabilities) plus the project-upgrade gap.
Theme: the core held — no artifact desynced, the gates caught real
problems — and the cost was at the edges: the delta merge was manual in
practice, the one-pass close was blocked by a mis-scoped global gate, the
ambiguity linter didn't speak the project's language, and intent
provenance froze at the intake. All fixed deterministically (ADR 0014).

### Added

- `doctrina intent add "<text>"` / `intent list` — post-intake intent
  evolution: append a new `[SC]` anchor to product.md (next number
  auto-allocated, or pin with `"SC15: <text>"`), so capabilities born
  after the intake get something to `Realizes:` instead of landing at
  `n/a` and leaving `trace` blind to the newest surface.
- `doctrina upgrade [--write]` — bring an existing project up to the
  installed CLI after an npm update (user-reported gap: the project keeps
  the scaffold of the version that init-ed it). Orchestrates
  `templates update` (additive-only) → index rebuild + stamp migration →
  `validate --fix`. Preview by default.
- `**Depends on:**` spec header — machine-readable capability links
  (specs cited each other only in prose). Parsed into the index, shown by
  `why` (both directions), pulled into `context <cap>` (dependencies join
  the read pack), and used by `review` (dependents of a touched capability
  are flagged).
- Project rules: `.doctrina/rules.json` — permanent lintable constraints
  (forbid-regex over glob paths, each with its own message), enforced as
  errors by `validate`. The home for instructions like "white-label:
  never name company X" that previously lived only in agent memory.
- `doctrina coverage --run` — execute the cited evidence via a
  project-declared `"evidence_runner"` command template in
  `.doctrina/verify.json` (`{file}` placeholder), promoting "the file
  exists" to "the proof passes". The CLI never guesses a test runner.
- `doctrina coverage --only <cap,cap>` — scope the report/gate to
  specific capabilities.
- `doctrina work --title "<short>"` — short display title drives the slug
  and proposal H1; the full prompt still lands under `## Why`.
- `doctrina spec set --version X.Y.Z` — set the spec version explicitly;
  the output now echoes the SPEC's resulting version.

### Changed

- **The mechanical-delta gap is closed** (review item #1): `change apply`
  treats an ADDED delta onto a target that is still the untouched
  `spec new` scaffold as a whole-file replacement — the canonical
  new-capability flow no longer collides with its own validator. The
  ` ```ops ` block syntax is now shown in the work playbook (step 3) and
  the `change apply` help, not only the delta template.
- **`doctrina close` gates coverage on the change's touched capabilities**
  (via `--only`), so one deliberately deferred spec elsewhere cannot block
  every unrelated close. A change with no deltas still gates on the whole
  tree.
- **`coverage` honours declared deferrals**: criteria in a spec with
  `Implementation: planned — <note>` (the same escape hatch `validate`
  honours) are reported as `deferred` — visible, never a `--strict`
  failure. Declared debt and hidden debt stop being punished identically.
- **`clarify` is language-aware** (review item #3): declare
  `{ "language": "pt-BR" }` in `.doctrina/config.json` or let a per-file
  stopword count decide. Portuguese mode swaps the lexicon (bare `TODO`
  is the pronoun; `some` is the verb *sumir*) so a PT-BR project is no
  longer permanently red. Inline suppression: a line with
  `<!-- clarify:ok -->` is author-accepted.
- **`skill suggest` deduplicates against existing skills** beyond exact
  slug: an existing skill citing the candidate's change id/commit, or
  token-overlap slug similarity, retires the candidate (a lesson captured
  under a different name no longer resurfaces).
- The `work` playbook adds an explicit **ADR checkpoint** ("does this
  change decide something structural? record it before closing") and
  closes with `doctrina close <id>` as the preferred, attested one-pass
  close; slugs truncate at a word boundary; `review` no longer caps
  capability detection at 3 (it missed 5 of 8 in the field session) and
  unions in changed specs.
- `change archive` stamps the proposal `Status: applied` when the change
  arrives still `proposed` (manual-merge path), so the file never
  contradicts the ledger; `design.md` scaffolds only under
  `change new --design`; a global `--version` no longer shadows a
  command's flag (`doctrina spec set x --version …` printed the CLI
  version and exited).

## [0.11.0] — 2026-07-02

Two moves in one release. First, close the gaps a full framework
self-review found: the CLI shipped operations its own surfaces never
named, the framework failed its own strictest gates (coverage 41%), and
its flagship feature (skills) had never been used on itself. Second, ship
the feature set that self-review motivated — session ergonomics for the
agent (cheap orientation, point reads, measurable context) and finish for
the human (diagnostics, completions, CI action, digests). 33 commands /
50 operations, still zero runtime dependencies.

### Added — agent efficiency

- `doctrina prime` — the session primer: gate digest, standing rules
  (accepted ADR titles + non-goals count), open work with task progress,
  and the top next actions in one ~40-line read. Sits between `status`
  and `context --concat`; start every session here.
- `doctrina handoff` — Markdown handoff note for the next session: each
  open change with its unchecked tasks and exact resume command
  (`doctrina work --resume <id>`), plus the gate digest and next actions.
  Deliberately a derived view, never a stored file — the tree is the
  truth and cannot go stale.
- `doctrina show <ref>` — point reads: `cli-R12` (a requirement, file
  order), `cli-C3` (an acceptance criterion by its own number), `0007`
  (an ADR), `cli` (spec header + Purpose). An agent that needs one
  requirement no longer re-reads a 400-line spec.
- `doctrina context` now reports a **token estimate per file and per
  pack** (chars/4); `--budget <n>` turns the estimate into a gate
  (exit 1 over budget; verdict on stderr under `--concat` so stdout
  stays pipeable); `--diff <ref>` scopes the pack to artifacts changed
  since a git ref (open changes always included) — the resume-session
  read. The skills listing now shows each skill's `when:` trigger, so
  the agent can fire the right skill without loading any body.
- `doctrina why` now walks provenance **in reverse** too: `doctrina why
  SC1` prints the anchor's product.md text, the capabilities realizing
  it (with proof ratios), and the archived changes behind them.
- `--json` on `status`, `next`, `validate`, `coverage`, and `trace` —
  stable machine-readable shapes for agents and CI pipelines.

### Added — human ergonomics

- `doctrina doctor` — aggregate diagnostic: validate (machine-read),
  index drift, coverage/trace ratios, `verify --clean`, `templates
  check`, and verify-config presence, each reported with its exact
  remediation command. A driver over existing commands, like `close`.
- `doctrina report [--since <days>]` — Markdown digest for standups/PRs:
  gate state, changes archived in the window, open work, artifact
  counts, and a local-git summary (no network).
- `doctrina completion bash|zsh|pwsh` — shell completions generated from
  the same `OPERATIONS` catalog that feeds `--help`, so they can never
  drift from the real surface.
- `doctrina init` interactive wizard step: on a TTY without `--agent`,
  init offers the adapter install (never fires in pipes/CI or under
  `--non-interactive`).
- **Official GitHub Action** (`action.yml` at the repo root): a
  composite action running the four structural gates (`validate`,
  `index rebuild --check`, `coverage --strict`, `trace --strict`), with
  `strict`/`version`/`working-directory`/`run-prefix` inputs. Our own CI
  dogfoods it against the working tree. New docs page: `docs/en/ci.md`
  (+ PT).

### Changed

- The `cli` spec's Purpose no longer hand-enumerates the surface — the
  `OPERATIONS` catalog in code is the single place the surface is named,
  and the spec points at it. Read-path/insight semantics (`context`,
  `search`, and the new commands) moved to the `gates` spec.
- Adapter honesty fix: the Aider adapter claimed `CONVENTIONS.md` is
  "loaded automatically"; Aider only reads it once wired
  (`aider --read CONVENTIONS.md`, or `read:` in `.aider.conf.yml`).
  Template and docs corrected. A new table-driven test asserts every
  `init --agent <x>` installs exactly the documented files, all ≤30
  lines, every pointer resolving to the root `AGENTS.md`.

### Added — self-review gap fixes

- **`gates` capability spec** — the gate and insight command semantics
  (`analyze`, `clarify`, `validate`, `coverage`, `trace`, `review`,
  `verify`, `close`, `status`, `why`, `constitution`) split out of the
  `cli` spec, which had crossed its own 400-line cap (551 lines → 399 +
  227). Seven specs now.
- **Five real skills** authored for the framework's own maintenance —
  `add-cli-command`, `cut-a-release`, `keep-docs-en-pt-parity`,
  `write-acceptance-evidence`, `split-an-oversized-spec` — created via
  `doctrina skill new` + `skill sync`. The skills feature is finally
  dogfooded; each captures a failure mode this repo actually hit.
- `OPERATIONS` catalog in `src/lib/commands.js`: the full 44-operation
  surface named in one place, with `--help` **generated** from it. New
  drift tests assert every operation is dispatched (not "unknown"), the
  top-level words equal `COMMAND_NAMES`, and `docs/{en,pt}/cli-reference.md`
  documents every operation.
- `doctrina validate` check #26: **bilingual docs parity** — in a project
  holding both `docs/en/` and `docs/pt/`, a Markdown file present in one
  language tree and missing from the other warns, in both directions.
- `scripts/check-docs.js` — executable shape check for the docs tree
  (EN↔PT parity, single H1, line caps, PT source note, README links),
  wired into `doctrina verify` as the `docs-shape` check and cited as
  evidence by the `docs` spec's acceptance criteria.
- Templates test suite: inventory test (every template the spec declares
  exists) and token-contract test (every `.template` uses ≥1 placeholder,
  all documented in the templates README). It immediately caught three
  undocumented tokens (`SKILL_NAME`, `CONTRACT_NAME`, `FRAMEWORK_VERSION`).

### Fixed

- **Hidden command surface**: `spec set` and `change abandon` were fully
  implemented and spec'd but absent from `--help`, `AGENTS.md`, and both
  CLI references; `templates update` and `contract list` were absent from
  `--help`; `skill suggest`, `decision land`, and `contract list` were
  absent from the `AGENTS.md` hub. All 44 operations are now named on
  every surface (AGENTS.md still exactly 148 lines).
- **`doctrina trace` had no section in the CLI reference** (EN or PT) —
  caught by the new docs drift test on its first run.
- **Coverage 41% → 100%**: all 33 acceptance criteria across the 7 specs
  now cite evidence that resolves. Fixed the two dangling citations
  (`docs` spec cited site files without the `docs/` prefix; `validation`
  spec cited the `memory/` folder ADR 0003 deliberately rejected) and
  reframed the `validation` criteria to measure the delivered protocol,
  keeping the per-run rubric as process guidance.
- README claimed "six capability specs and five accepted ADRs" while the
  repo held twelve accepted ADRs; docs READMEs said "40 operations" —
  counts reconciled (EN + PT).
- `docs/pt/flow.md` was missing the "EN is the source" note every PT doc
  carries.
- Removed two stale session artifacts from the repository root
  (`integracao.md`, `RESUMO-EXECUTIVO.md`); their content already lives,
  polished, in `docs/{en,pt}/adoption-playbook.md`.

## [0.10.0] — 2026-06-28

Make the `AGENTS.md` hub honest and the workflow discoverable. An audit found
the framework's own hub — the file the agent reads first — was the most stale
file in the repo (it declared an old version and omitted commands), and that
nothing kept it fresh. This release closes the traceability gaps the hub
created and brings the agent-native discoverability the field's leaders have.

### Added

- `doctrina constitution` — print the project's standing rules in one read:
  the accepted ADRs (immutable governing decisions, oldest first) and the
  `## Non-goals` of `product.md`. The Spec Kit `constitution.md` analogue,
  assembled read-only from artifacts those files already own — no new home for
  facts. (27th command.)
- **Native slash commands** for the core loop, installed by `doctrina init
  --agent claude` and `--agent cursor` (and `--agent all`): `/doctrina-work`,
  `/doctrina-next`, `/doctrina-context`, `/doctrina-status`, `/doctrina-why`.
  Each is a thin prompt that invokes the CLI, so the workflow is discoverable
  inside the agent — not only by the agent knowing to shell out. The CLI stays
  the single source of truth.
- `doctrina validate` now flags **AGENTS.md command-surface drift**: a
  reference to a command the CLI does not have (typo/removed), and — for a hub
  that maintains a command catalog and does not defer to `doctrina --help` —
  commands the CLI ships that the hub omits. Closes the "the hub rots while
  validate stays green" gap (it previously checked only the file's size).
- `doctrina validate` now warns on a **self-certified acceptance criterion**:
  one marked `[verified]` that cites no proof path (honest gates, ADR 0008).
- `index.json` now records the root `AGENTS.md` under `artifacts.entrypoint`,
  so a tool enumerating the index can reach the hub the agent reads first —
  the machine-readable graph closes in both directions.
- `doctrina why <capability>` gained a **History** section listing the
  archived changes that built the capability (from the index ledger), so the
  provenance chain reaches back to the work that delivered the spec.

### Changed

- `doctrina context` with no capability now includes **every active spec** in
  the read pack (previously it jumped from `product.md` straight to the ADRs,
  leaving the current truth out of the default orientation read).
- `doctrina why` reads acceptance criteria through a shared multi-line parser,
  so a criterion that cites its proof on a continuation line is no longer
  mis-reported as "no evidence cited" — `why` and `coverage` now agree. The
  Proof marks also distinguish a `[verified]` claim with no proof (`~`) from a
  genuine green (`✓`).

### Fixed

- The root `AGENTS.md` declared `v0.4.0` while the CLI was current and omitted
  six commands (`status`, `why`, `trace`, `review`, `close`, `watch`) — the
  whole visibility/traceability set. Refreshed, and the new drift gate keeps
  it honest going forward.
- Version stamps reconciled across `README.md`, `README.pt.md`, and the CLI
  package README (they had drifted to three different values); the canonical
  source is `packages/doctrina-cli/package.json`.

## [0.9.0] — 2026-06-28

Make `skill suggest` useful outside the change lifecycle (ADR 0013). In 0.8 it
scanned only `.doctrina/changes/archive/`, so in any repo that does its work
directly in git — including Doctrina's own — the archive stayed empty and the
command never surfaced anything.

### Changed

- `doctrina skill suggest` now draws fix-shaped candidates from **two**
  deterministic sources: archived change proposals *and* fix-shaped commits in
  the git commit history (conventional `fix:`/`bug:`/`hotfix:`/`patch:` and a
  small set of debugging keywords; never `feat:`/`refactor:`). Candidates are
  deduplicated by slug against existing skills, with the archive winning a
  collision, and each shows its origin (`from <archive>` or `from commit
  <sha>`). The git source degrades silently to archive-only when there is no
  repo. Still a deterministic hint that only surfaces candidates — skills stay
  human-authored (ADR 0005).

### Added

- `doctrina skill suggest --since <ref>` scans commits in `<ref>..HEAD`
  instead of the most recent 200 (e.g. `--since v0.7.0`).

## [0.8.0] — 2026-06-27

Passive-user feature set (ADR 0012): new commands so the AI agent drives the
loop and the human stays passive — give intent, approve. All deterministic and
read-only unless they scaffold/close, with the semantic-fidelity ceiling
(ADR 0005) intact.

### Added

- `doctrina status` — one-glance health dashboard (index drift, framework
  stamp, coverage %, trace anchors, verify config, artifact counts).
  Read-only; the fast summary that `validate`/`verify` back authoritatively.
- `doctrina close <id>` — run the whole closing sequence in one pass
  (analyze → change apply → verify → coverage `--strict` → trace → change
  archive → validate), stopping at the first failure with the exact rerun
  command. A driver over the existing commands; adds no checks of its own.
- `doctrina review [--diff <ref>] [--strict]` — deterministic conformance
  review of the working tree (or a diff against a ref) against the spec / ADR
  / contract tree: code changed under a capability whose spec was not updated,
  changed code mapping to no capability, acceptance criteria citing missing
  proof, dropped product intent, contract collisions. Checks conformance
  shape, never semantic fidelity.
- `doctrina why <capability>` — print a capability's provenance chain: the
  product intent it `Realizes:`, its purpose, the acceptance criteria that
  prove it, and the accepted ADRs that name it. Read-only.
- `doctrina watch [--once]` — re-run `validate --fix` and reprint
  `doctrina next` on every change under `.doctrina/` (debounced, ignoring the
  index.json the fix rewrites), so state stays synced and the agent stays
  oriented without anyone invoking a command. `--once` runs a single pass.
- `doctrina skill suggest [--write]` — surface fix-shaped archived changes
  whose skill is not yet captured; `--write` scaffolds a stub per candidate,
  pre-seeded from the change, and indexes it.
- `doctrina verify` qualitative gate: a check with `"type": "manual"` is
  judged by a human/eval and recorded as a sign-off
  (`.doctrina/verify.signoffs.json`) rather than run — pending by default
  (non-blocking), failing only under `--strict`. Record one with
  `doctrina verify --signoff "<name>=<note>"`.

### Changed

- The `AGENTS.md` "Doctrina command surface" map gains the new commands
  (`status`/`why` under read-orient, `close` under advance-close, `review`
  under gates, plus a `watch`/`skill suggest` line), so an agent self-serves
  them on any task.

## [0.7.0] — 2026-06-27

Framework-review follow-up (`REVIEW-doctrina-2026-06-27.md`): the review's
diagnosis was that the loop-closing features are competent but **passive** —
they exist and nothing pulls them into the default flow, so they wither. This
release pulls them in. All changes are deterministic and advisory (ADR 0011).

### Added

- Intent provenance is now **opt-out, not opt-in**: `doctrina spec new`
  scaffolds a `**Realizes:**` header, and `doctrina validate` warns when an
  `active` capability spec on the implementation axis declares none. Any value
  silences it, including a deliberate `**Realizes:** n/a — <why>` for an
  internal capability. The `work` playbook gains a step to tag a `product.md`
  `[SC1]` anchor and set `Realizes:`, and lists `doctrina trace` among the
  closing gates. (ADR 0011)
- `doctrina next` surfaces two new priority-ordered actions: suggest
  `doctrina decision land NNNN` for an accepted ADR with neither Evidence nor
  Landed, and a one-time skill-capture nudge when no skill exists yet and an
  archived change is fix-shaped. Both fire only when warranted. (ADR 0011)
- The `work` and chore playbooks end with a `doctrina skill new` nudge when a
  change taught a reusable lesson worth not relearning. (ADR 0011)

### Changed

- The shipped pre-commit hook now runs `doctrina validate --fix` (was a bare
  `validate`): it regenerates `index.json` from the tree — healing metadata
  drift and migrating the `framework_version` stamp — re-stages the index, and
  still blocks the commit on errors a rebuild cannot heal. This eliminates the
  most common gate failure at commit time instead of reporting it. Editable
  back to a bare `validate` for CI-style fail-on-drift gating. (ADR 0011)
- The `AGENTS.md` template's "How to read context efficiently" section now
  **leads with** `doctrina context [<capability>] --concat` as the single
  command that assembles the read pack for any task — review, debug, a
  question — not only `doctrina work`. (ADR 0011)
- The `AGENTS.md` template gains a dense **"Doctrina command surface"** map
  grouped by moment (read/orient · start · scaffold · advance/close · gates),
  so an agent self-serves the whole CLI instead of only the ~6 commands the
  template used to name — the rest were reachable only via the `work` playbook
  or `doctrina --help`. Manual creation stays first-class; kept under the
  150-line budget. (ADR 0011)

## [0.6.0] — 2026-06-22

Adoption ergonomics for existing/in-progress codebases (ADR 0010).

### Added

- `doctrina work --from-diff` — code-first backfill: scaffold a change from the
  working-tree changes (no prompt) and print a playbook to write the spec that
  describes what the code already does (F8).
- `--chore` / `--no-spec` lane on `doctrina change new` and `doctrina work` —
  a spec-less home for infra/docs/build/migration changes that runs the full
  proposal → apply → archive → ledger lifecycle without a fabricated delta (F9).
- Diff-ranked capability hint in `work` — capabilities are ranked by which
  working-tree files were touched, not just prompt term overlap (F10).

### Changed

- `doctrina validate` warns when a known metadata header is not in the
  canonical `**Key:** value` form — turning the silent non-parse footgun into a
  visible, fixable warning (G11).

## [0.5.0] — 2026-06-22

Honest gates and single-source drift truth (ADRs 0007–0009).

### Added

- Structured `MODIFIED` spec deltas: a fenced ops block applied mechanically by
  `doctrina change apply` (ADR 0007).
- `doctrina change abandon <id>` — discard an open change cleanly (F2).
- `coverage` `conditional` verdict — a criterion proven only by a statically
  skipped test suite is not proof, and fails `--strict` (ADR 0008).
- `doctrina verify --clean` — clean-checkout reproducibility lint (ADR 0008).
- `doctrina spec set <cap>` — edit a spec's headers / a criterion mark and
  resync the index in one step, no manual lockstep bump (ADR 0009).
- `doctrina validate --fix` — regenerate the index from the tree before
  checking, repairing drift instead of only reporting it (ADR 0009).
- `doctrina work --resume <id>` — reprint an open change's playbook instead of
  fabricating a junk change from a bare "continue" prompt (F1).

### Changed

- `doctrina validate` now treats index **metadata** drift as an error (was a
  warning): validate is the single source of truth about whether the project is
  OK (ADR 0009).

## [0.4.0] — 2026-06-19

Framework-review follow-ups: tighten the framework's own hygiene where
guardrails were missing, and start closing the intent→spec→test loop.

### Added

- `doctrina trace` — intent-provenance report (ADR 0006). Tag `product.md`
  bullets with an anchor (`- [SC1] ...`) and declare `**Realizes:** SC1` on
  the specs that deliver them; `trace` reports dropped intent (an anchor no
  spec realizes), dangling realizes, and untraceable specs. Read-only;
  `--strict` gates. Composes with `coverage` into the chain *intent →
  capability → criterion → test*. It checks that the link is complete, not
  that a criterion is faithful to the intent (that stays a human/LLM call).
- Clarification gate (review Topic A): `doctrina intake` and `doctrina work`
  flag a thin / under-specified description or prompt (too few words, no
  concrete terms, or heavy vague/weasel wording) and ask the agent to clarify
  with the user before converting to specs or writing deltas. Advisory, never
  blocking — the intake/change is still captured.
- `doctrina decision land <number> [path ...]` — record that an accepted
  ADR is now implemented by stamping a non-mutating `Landed:` header (date
  plus cited proof) without editing the immutable decision body. Closes the
  gap where a design-time ADR ("Evidence: n/a — no implementation yet") had
  no first-class way to note that reality caught up, short of a heavyweight
  supersede.
- `index.json` now records the `framework_version` that manages it: it is
  stamped on every write and on `init`. `doctrina validate` warns when the
  stamp is absent or behind the running CLI, and `doctrina index rebuild`
  migrates it.
- `doctrina validate` errors when two ADR files share the same `NNNN`
  number — the merge-time allocation collision that previously let one
  decision silently shadow another in the index.

### Changed

- `doctrina search` now ranks results best-first within each category
  (heading / metadata-header / full-phrase / filename matches score higher)
  and shows the highest-scoring lines per file, instead of returning the
  first matches unordered.
- `doctrina validate` evidence check now also reads the `Landed:` header:
  an accepted ADR is only flagged "no evidence" when both `Evidence:` and
  `Landed:` are empty, and dangling citations in either are reported.

### Fixed

- `doctrina change apply` left the change entry's `status` in `index.json`
  at `proposed` while flipping `proposal.md` to `applied`, so the index
  drifted from the tree in the whole apply→archive window (a pre-commit
  `index rebuild --check` would fail there). The entry now mirrors the
  proposal, for both delta and metadata-only applies.

## [0.3.0] — 2026-06-16

Closes the gap between what a spec promises and what the code/tests prove.
A framework review found Doctrina validated **form, not truth**: the docs
could look finished while the system was half-built, and `validate` passed.
This release adds the truth-checking guardrails. Every new gate has an
opt-in or `--force` escape hatch — block, never imprison.

### Added

- **Two-axis spec status.** A capability spec now carries an
  `Implementation:` state (`planned`/`partial`/`implemented`/`verified`)
  independent of the document `Status:`. `spec list` shows both;
  `validate` warns when an `active` spec is still `planned` with no note
  (an inventory claim with nothing behind it). New specs scaffold honestly
  as `draft`/`planned`.
- **`doctrina coverage`.** Reports, per spec, how many acceptance criteria
  cite an evidence path (a backtick file token) that exists — covered,
  dangling (cited path missing), or bare (none cited). A report by default
  (exit 0); a CI gate under `--strict`.
- **`doctrina verify`.** Runs the project-declared build checks from
  `.doctrina/verify.json` (typecheck/test/build) through the shell and
  fails on any non-zero — the real "does the code work" gate, distinct
  from the structural `validate` and never run by the pre-commit hook.
  `--init` scaffolds the config, `--list` prints it.
- **Contract artifact (`doctrina contract new|list|check`).** A
  first-class home under `.doctrina/contracts/` for the integration/
  runtime surface no capability owns — port map, environment, interfaces.
  `contract check` fails on a port collision or a missing referenced spec,
  and warns when a declared env var is absent from `.env.example`.
- **ADR `Evidence:` header.** Anchors a decision to the files that prove
  it; `validate` warns when cited evidence is missing on disk (decision
  drift) or when an accepted ADR cites none.
- **Spec template `## Maturity` boundary** (MVP vs aspirational) and
  `[verified]`/`[unverified]` acceptance-criteria markers, so a product
  wishlist cannot be smuggled in as committed EARS requirements.

### Changed

- **`doctrina change archive` now enforces verification.** It refuses
  (exit 1) while any `tasks.md` checkbox (closing steps included) or any
  item in the proposal's `## Verification` checklist is unchecked, unless
  `--force` is passed (which archives and records the gap). "Done" is no
  longer honour-based.
- **`doctrina validate` cross-checks the archive ledger against
  `index.json.changes_archive`** and fails on divergence — two sources of
  truth for the same history can no longer silently disagree.
- Proposal template ships a `## Verification` checklist; product template
  ships a "Delivery order (walking skeleton)" section (depth before
  breadth — verify one end-to-end slice before fanning out capabilities).

## [0.2.0] — 2026-06-13

### Added

- **Agent-executed playbooks: `doctrina intake` and `doctrina work`**
  (ADR 0005). Two commands collapse the per-feature ceremony by handing
  the natural-language half to the AI agent that runs them, while the
  CLI stays offline and zero-dependency. `intake <file>` (or
  `init --intake <file>`) stores the full project description verbatim
  at `.doctrina/intake.md` and prints the bootstrap playbook the agent
  executes to fill `product.md`, derive capabilities, and author one
  EARS spec each before flipping the intake to `converted`;
  `init --intake` prints that playbook inline so the conversion is a
  single command. `work "<prompt>"` turns a brief prompt into a
  scaffolded change — a sequential `NNNN-slug` id, the prompt recorded
  as the proposal's `## Why`, existing specs ranked by deterministic
  term overlap as a capability hint — then prints the work playbook
  (context → delta → tasks → implement → analyze → apply → archive →
  validate). The scaffolded `AGENTS.md` now instructs any
  AGENTS.md-aware agent to detect a pending intake and run the bootstrap
  on its own, and `doctrina next` surfaces a pending intake ahead of all
  other work. The CLI's own language processing is capped at slugging
  and case-insensitive term counting; everything semantic is the
  agent's. Bilingual docs (cli-reference, workflow) and integration
  tests included — the suite is now 82.
- **Documentation site.** Zero-build Docsify shell at
  `docs/index.html`, served straight from the `docs/` folder via
  GitHub Pages: bilingual EN/PT with per-language sidebars,
  full-text search, language-aware landing pages with a 5-minute
  usage walkthrough, and new Contributing and Donations pages in
  both languages. The Markdown stays the artifact; the site is a
  view (docs spec bumped to 0.2.0 to permit exactly this and no
  build pipeline). `.github/FUNDING.yml` added for the GitHub
  Sponsor button.
- **Project logo.** The `{D}` monogram — doctrine inside the
  developer's braces — chosen as the official mark; ships as
  plain SVG at `docs/assets/logo-monogram.svg` and is used by
  the docs site and the README. The deferred-register logo entry
  is updated to record the resolution.
- **`doctrina context [<capability>]` (with `--concat`).** The
  AGENTS.md read order turned into tooling: prints the exact
  context pack for a task — root rules, product, the capability
  spec, open changes, accepted ADRs — with line counts, plus an
  on-demand skill list (name + description only). `--concat`
  prints the contents, ready to hand to an agent. Archive and
  non-accepted ADRs excluded by design.
- **`doctrina search <term> [...]` (with `--archive`).**
  Category-grouped, case-insensitive search across specs,
  decisions, changes, skills, product, and AGENTS.md. Answers
  "where is X decided?" without knowing the tree layout.
- **`doctrina decision accept <number>` and `decision list`.**
  Accepting an ADR no longer requires a hand edit; only the
  `Status:` header is rewritten. `doctrina next` now points at
  the command. `list` enumerates ADRs with status, date, title.
- **`doctrina spec list`.** Specs with version, status, line
  count, and last-updated, read from the headers.
- **`doctrina clarify --all`.** One-pass smell sweep over every
  living document (product, specs, open changes, skills); ADRs
  and the archive stay out. CI-friendly exit code.
- **`doctrina index rebuild` (with `--check`).** Regenerates
  `index.json` from the artifacts on disk — spec headers, ADR
  headers, change proposals, archive folder names, skill
  frontmatter. The files are the source of truth; the index is now
  a derived artifact. `--check` is CI-friendly: writes nothing,
  exits 1 on drift with a per-category summary.
- **`doctrina next`.** Read-only state machine over the tree:
  prints the recommended next workflow actions in priority order
  (open changes, unchecked tasks, deltas ready to apply,
  applied-but-unarchived, ADRs stuck in proposed, index drift).
  Lets agents and humans resume work without re-reading the tree.
- **`doctrina change diff <id>`.** Read-only preview of every spec
  delta: summary for ADDED/REMOVED, unified line diff (zero-dep
  LCS) between the target spec and the delta body for MODIFIED.
- **`doctrina metrics` (with `--since`, `--save`).** Local-only
  adoption metrics derived from git history: commits, revert rate,
  Conventional-Commit fix share, top-churn files, 21-day re-edit
  proxy. `--save` snapshots to `.doctrina/metrics/` and prints
  deltas against the previous snapshot. No network calls — the
  tooling half of the validation A/B protocol.
- **EARS shape checks in `validate`** (#17). Every spec declaring
  `## Requirements (EARS)` gets per-section grammar checks:
  When/While/Where placement and shall/may usage (warnings only).
  Dogfooding immediately caught two real defects in this repo's
  own specs: an event-shaped requirement filed under Ubiquitous in
  the cli spec, and a State-driven requirement without "shall" in
  the skills spec. Both fixed.
- **Nested `AGENTS.md` size caps in `validate`** (#18). The
  "nearest AGENTS.md wins" hierarchy was documented but never
  enforced; nested files now get the same 150/200-line caps as
  the root, with dependency/build/VCS directories skipped.
- **Archive ledger.** `change archive` appends a one-line summary
  (date, id, title, affected specs) to
  `.doctrina/changes/archive/LEDGER.md` — scannable episodic
  memory without opening archive folders or putting them back on
  the default read path. Append-only.
- **`doctrina templates update`.** Additive-only fixer for what
  `templates check` reports: preview by default (exits 1 while
  pending, writes nothing), `--write` to apply, never rewrites or
  removes existing content. This lifts the deferred-register item
  at exactly the bar it set (opt-in + dry-run preview); the
  register entry is updated accordingly.
- Integration tests for all of the above (64 tests total).
- **`doctrina skill sync`.** Mirrors each skill's frontmatter
  `description:` into `.doctrina/index.json`, removing the last
  edit-the-index-by-hand step in the skill workflow. The
  frontmatter is the single source of truth.
- **Two `validate` checks.** #15 warns when a capability spec's
  `Version:` header drifts from the version recorded in
  `index.json`; #16 warns when a skill's frontmatter description
  drifts from the indexed one (pointing at `skill sync`).
- **ADR 0002 tombstone.** Records that the number was consumed by
  a pre-foundation draft and never published, so the ADR sequence
  is contiguous and self-explaining.
- Integration tests for `decision supersede`, the MODIFIED-delta
  manual-merge path of `change apply`, `skill sync`, and both new
  validate checks.

### Fixed

- `change archive` recorded the change id instead of the title in
  the index for ids containing hyphens (the documented `NNNN-slug`
  convention): the proposal-title regex stopped at the first
  hyphen. Found by `index rebuild --check` during dogfooding.
- The `init` index template now ships the `skills: []` category
  (older indexes without it compare equal — no action needed).
- **Documentation coherence.** Adapter counts unified everywhere
  to the actual surface (12 supported agents: 7 thin-pointer
  adapters + 5 AGENTS.md-native) — `product.md`, `adapters.md`,
  `local-llms.md`, `comparison.md`, `migration.md`, `deferred.md`
  and the package README previously disagreed (3 vs 8 vs 12).
  Command count restated as "10 commands (16 operations)".
- **Research citations sourced.** The BrowseComp 80%-of-variance
  and 15× token-cost figures now link their source (Anthropic
  engineering blog) and are worded to pass `doctrina clarify` on
  merit instead of hiding inside backtick spans.
- `index.json` spec versions resynchronised with the `Version:`
  headers on disk (cli, templates, skills).
- Root `.doctrina/skills/` directory now exists, matching the
  skeleton the README describes.
- Templates inventory README now lists all 12 adapters, the skill
  and bug-spec templates, and the hooks samples.
- CLI spec acceptance criterion for `npm pack` updated to include
  the `templates/` directory shipped since the 0.1.0 release fix.
- Windows behaviour of the pre-commit hook documented (runs under
  Git Bash; executable bit is a no-op on NTFS).

## [0.1.0] — 2026-06-03

First public release. Establishes the foundation, the templates,
the CLI, the documentation, and the empirical validation
protocol. Built dogfooded — every artifact in this release was
produced via the framework's own change workflow.

### Added

- **Framework foundation.** Root `AGENTS.md` (open standard),
  `.doctrina/` artifact tree, `product.md`, five capability
  specs (`core`, `templates`, `cli`, `docs`, `validation`), three
  architectural ADRs (`0001` AGENTS.md adoption, `0003` defer
  `memory/`, `0004` single linear orchestrator).
- **CLI** (`doctrina`, zero runtime dependencies, Node.js 20.12+):
  `init`, `spec new` (with `--bug`), `change new|apply|archive`,
  `decision new|supersede`, `analyze`, `clarify`, `validate`,
  `hooks install`.
- **Templates.** AGENTS.md template, `.doctrina/` skeleton,
  capability spec, bug-shape spec, change folder contents
  (proposal/tasks/design/spec-delta), ADR (Nygard/MADR),
  per-agent adapters for Claude Code, OpenAI Codex CLI, and
  Cursor, pre-commit hook template, on-save watcher template.
- **Documentation** (English-primary, Portuguese translations of
  every file). Twelve docs: getting-started, workflow,
  cli-reference, adapters, multi-agent model, context
  engineering, gating, antipatterns, validation, glossary,
  brownfield, comparison.
- **Quality gates.** `doctrina validate` ships eleven checks
  including size warnings, orphan detection, and stale-reference
  detection (Markdown link targets that no longer exist on
  disk). `doctrina analyze` inspects a change folder before
  applying. `doctrina clarify` smell-tests Markdown for weasel
  words, vague quantifiers, and placeholders.
- **Empirical validation protocol.** The `validation` capability
  spec defines seven metrics (DORA four plus rework rate,
  cost-per-feature, PR review time) and four pre-declared
  decision triggers. The validation doc walks teams through the
  four-step procedure manually; the harness is deferred until at
  least one project executes the protocol.
- **CI.** GitHub Actions workflow runs the test suite and
  self-validation on every push to `main` and every pull request.
- **OSS hygiene.** This changelog, `CONTRIBUTING.md`, and
  `SECURITY.md`.

### Notable choices not made

- No `memory/` folder. Deferred per ADR 0003 until measured
  empirical pain justifies the complexity.
- No role-based parallel agents. Rejected per ADR 0004 on the
  basis of the Cognition and Anthropic research findings about
  multi-agent fan-out for code work.
- No runtime dependencies. The CLI deliberately uses only Node
  standard library imports.
- No telemetry, no network calls, no analytics endpoints. See
  `SECURITY.md`.

### Known limitations at 0.1.0

- Native agent support is limited to Claude Code, OpenAI Codex
  CLI, and Cursor. Other agents read AGENTS.md natively but do
  not get a Doctrina adapter at install time.
- The CI matrix runs only on Ubuntu. macOS and Windows will be
  added in 0.2.0.
- No `npm publish` workflow ships in 0.1.0. The package is
  installable from source; the publish workflow lands in 0.2.0.
- Examples folder includes two reference projects (a
  Python FastAPI service and a TypeScript Express retrofit);
  the leading competitors ship dozens.
