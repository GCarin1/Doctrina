# doctrina-cli

> CLI for the Doctrina framework. The package is published as
> `doctrina-cli`; the executable it installs is `doctrina`.

**Status:** v0.16.0 — current release. Zero runtime dependencies
(Node.js standard library only).

## Install

```
npm install -g doctrina-cli
# or run on demand
npx doctrina-cli init
```

Requires Node.js 20.12 or later.

## Commands

Start with `doctrina init` in your repository, then tell your AI agent to
read `AGENTS.md` and run `doctrina next` — it drives the rest. The
surface, by the moment you reach for it:

```
Bootstrap   init · intake · adapter list|add|remove
Orient      prime · next · status · context · show · search · why · handoff
Change      triage · work · spec new|list|set · change new|apply|archive|check|tick|abandon
            contract new|list|check · decision new|accept|land|supersede|list|scope
            skill new|list|suggest · intent add|list
Gate        analyze · clarify · validate · coverage · trace · review · verify · close · doctor
Maintain    upgrade · index rebuild · hooks install · watch · metrics · completion · ci · templates list
```

`doctrina --help` prints the same grouping with one line per command, and
`doctrina <command> --help` the flags of each. Every command, flag and exit
code is in the
[CLI reference](https://github.com/GCarin1/Doctrina/blob/main/docs/en/cli-reference.md).

## `init` flags

| Flag | Purpose |
|------|---------|
| `--project-name <name>` | Override the project name (defaults to cwd basename) |
| `--project-description <text>` | One-sentence description, with no intake. Without it on a terminal, `init` asks you to describe the project once and keeps the answer as the intake |
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
  / `append-criterion` / `append-requirement` / `replace-requirement`),
  applies it mechanically to the target spec — all
  ops or none — and regenerates the index (ADR 0007). Without an ops
  block it prints a manual-merge pointer and does not write: auto-merging
  arbitrary prose is the kind of implicit decision Doctrina avoids.

On any spec write, the index is rebuilt from the tree so it never drifts
from the applied spec. `doctrina change abandon <id>` is the inverse of
`change new`: it deletes an open change and its index entry and ledgers
the abandonment. `doctrina close <id>` runs apply together with verify,
coverage, archive and validate in one attested pass — the definition of
done.

## `validate` checks

Structure, schema, EARS grammar, index drift, size caps, links, skills,
ADR anchoring and more — the full, numbered list with the reason for each
check is in the
[CLI reference](https://github.com/GCarin1/Doctrina/blob/main/docs/en/cli-reference.md#doctrina-validate).
A second copy here fell behind it once; there is now one list.

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
