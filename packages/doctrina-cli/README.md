# doctrina-cli

> CLI for the Doctrina framework. The package is published as
> `doctrina-cli`; the executable it installs is `doctrina`.

**Status:** v0.4.0 — current release. Zero runtime dependencies
(Node.js standard library only).

## Install

```
npm install -g doctrina-cli
# or run on demand
npx doctrina-cli init
```

Requires Node.js 20.12 or later.

## Commands

```
doctrina init                              scaffold AGENTS.md + .doctrina/ in cwd
doctrina intake [<file>]                   store the full description + bootstrap playbook (clarification gate)
doctrina work "<prompt>"                   brief prompt -> scaffolded change + work playbook (clarification gate)
doctrina work --resume <id>                reprint an open change's playbook (no new change)
doctrina work --from-diff                  backfill a spec from working-tree changes (code-first)
doctrina work "<prompt>" --chore           spec-less chore (infra/docs/build): no spec-delta steps
doctrina spec new <capability>             create a capability spec
doctrina spec list                         list specs with version, status, size
doctrina spec set <cap> [--bump ...]       edit spec headers/criterion + resync index (no lockstep)
doctrina change new <id> "<title>"         open a change proposal
doctrina change apply <id>                 apply spec deltas (ADDED/REMOVED auto; MODIFIED ops block applies)
doctrina change archive <id>               archive an applied change
doctrina change abandon <id>               delete an open change + its index entry (ledgered)
doctrina change diff <id>                  preview spec deltas (line diff for MODIFIED)
doctrina contract new <name>               own the integration surface (ports, env, interfaces)
doctrina contract check                    verify port collisions, env drift, referenced specs
doctrina decision new "<title>"            create the next sequential ADR
doctrina decision accept <num>             flip a proposed ADR to accepted
doctrina decision land <num> [path...]     stamp an accepted ADR as implemented (non-mutating Landed:)
doctrina decision supersede <num> "<t>"    supersede an existing ADR
doctrina decision list                     list ADRs with status, date, title
doctrina skill new <name>                  scaffold an on-demand procedural-memory skill
doctrina skill list                        list skills with descriptions (read-only)
doctrina skill sync                        mirror skill frontmatter descriptions into index.json
doctrina analyze <change-id>               inspect a change folder before applying
doctrina clarify <path>                    smell-test a Markdown file for ambiguity (--all: tree)
doctrina context [<capability>]            print the context pack in read order (--concat)
doctrina search <term> [...]               search artifacts, grouped by category (ranked)
doctrina validate                          schema + artifact-existence + index-drift checks (--fix rebuilds)
doctrina coverage                          acceptance criteria with linked evidence (--strict gates; skips = conditional)
doctrina trace                             intent provenance: product intent -> specs (--strict gates)
doctrina verify                            run project typecheck/test/build checks (the real gate)
doctrina verify --clean                    reproducibility lint: clean-checkout footguns (dist/codegen)
doctrina templates list                    enumerate shipped templates
doctrina templates check                   compare project against recommended template shape
doctrina templates update                  additive fixer for check findings (preview; --write applies)
doctrina hooks install                     install pre-commit hook
doctrina index rebuild                     regenerate index.json from the files (--check for CI)
doctrina next                              print the recommended next workflow actions
doctrina metrics                           local git-derived adoption metrics (no network)
doctrina --help | -h                       print the command surface
doctrina --version | -v                    print the package version
```

Per-command help is available with `doctrina <command> --help`.

## `init` flags

| Flag | Purpose |
|------|---------|
| `--project-name <name>` | Override the project name (defaults to cwd basename) |
| `--project-description <text>` | One-sentence description (prompted if omitted) |
| `--agent <name>` | Install the adapter for one of the twelve supported agents (`claude`, `codex`, `cursor`, `copilot`, `gemini`, `aider`, `windsurf`, `continue`, `amp`, `devin`, `factory`, `jules`) or `all` |
| `--date <YYYY-MM-DD>` | Override the system date in artifacts |
| `--force` | Overwrite existing files |
| `--non-interactive` | Fail instead of prompting for missing required values |

## Adapter behaviour

- `--agent claude` writes a `CLAUDE.md` at the project root that
  `@`-imports `AGENTS.md`. Claude Code picks it up automatically.
- `--agent cursor` writes `.cursor/rules/00-doctrina.mdc` with
  `alwaysApply: true` pointing at `AGENTS.md`. `copilot`, `gemini`,
  `aider`, `windsurf`, and `continue` follow the same thin-pointer
  pattern at each agent's native path.
- `--agent codex` (and `amp`, `devin`, `factory`, `jules`) installs
  nothing: these agents read `AGENTS.md` natively.
- `--agent all` installs every adapter.

All adapter files are kept under 30 lines to avoid per-turn token tax
and to make drift from `AGENTS.md` mechanically impossible.

## `change apply` semantics

For each spec delta found under `.doctrina/changes/<id>/specs/`:

- **ADDED:** writes the delta body to the target spec; refuses if the
  target already exists.
- **REMOVED:** deletes the target spec.
- **MODIFIED:** when the delta carries a fenced ` ```ops ` block
  (`set-header` / `bump-version` / `set-criterion` / `replace-criterion`
  / `append-criterion`), applies it mechanically to the target spec — all
  ops or none — and regenerates the index (ADR 0007). Without an ops
  block it prints a manual-merge pointer and does not write: auto-merging
  arbitrary prose is the kind of implicit decision Doctrina avoids.

On any spec write, the index is rebuilt from the tree so it never drifts
from the applied spec. `doctrina change abandon <id>` is the inverse of
`change new`: it deletes an open change and its index entry and ledgers
the abandonment.

## `validate` checks

1. `AGENTS.md` exists at root and is ≤ 200 lines (warns at > 150).
2. `.doctrina/product.md` exists.
3. `.doctrina/index.json` parses and matches the v0.1 shape.
4. Every artifact referenced in `index.json` exists.
5. Every ADR has a parseable `Status:` header.
6. Every adapter template under `.doctrina/templates/adapters/` is ≤ 30 lines.
7. Every open change has a `proposal.md`.
8. Capability specs are ≤ 400 lines (warns above).
9. ADRs are ≤ 300 lines (warns above).
10. Spec/ADR files on disk are present in `index.json` (orphan warn).
11. Markdown links inside specs/ADRs resolve to real files (stale ref warn).
12. Skills carry the required frontmatter triple (`name`, `description`, `when`).
13. Skills are ≤ 200 lines (warns at > 150).
14. Each skill's `name:` matches its filename slug.
15. Indexed artifact metadata (spec/decision/change/contract) matches its
    file — a mismatch is an **error** so a green `validate` can't hide the
    drift `index rebuild --check` would catch (G5; `validate --fix` rebuilds).
16. Each skill's frontmatter description matches `index.json` (drift warn; `skill sync` fixes).
17. EARS grammar shape per section in specs declaring `## Requirements (EARS)` (warn).
18. Nested `AGENTS.md` files obey the root size caps (warn > 150, error > 200).
19. No two ADR files share the same `NNNN` number (merge-collision error).
20. `index.json` records a `framework_version` matching the running CLI
    (stamp-divergence warn; `index rebuild` migrates it).
21. Accepted ADRs anchor to reality via `Evidence:` and/or `Landed:`; cited
    paths must exist on disk (drift warn).

Exit code: 0 if no errors (warnings allowed), 1 otherwise. `--fix`
regenerates `index.json` from the tree before validating.

Two related read-only reports gate separately: `doctrina coverage`
(each acceptance criterion cites a real test; a criterion proven only by
a skipped suite is `conditional` and fails `--strict`) and `doctrina
trace` (each product intent has a capability, each capability traces to
an intent). Both exit 1 under `--strict` for CI. `doctrina verify
--clean` statically lints for clean-checkout footguns (a build-dir entry
point with no `prepare`; a Prisma dep with no generate on install).

## Tests

```
npm test
```

Runs the suite via the built-in Node test runner. The integration tests
spawn the CLI as a subprocess and exercise the full surface against a
temporary project directory.

## License

MIT.
