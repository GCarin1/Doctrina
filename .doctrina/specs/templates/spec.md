# Spec — Templates and Scaffolding

**Capability:** templates
**Status:** active
**Implementation:** implemented
**Realizes:** n/a — internal framework capability; product success criteria measure adopting-team outcomes, not the tool's own surface
**Last updated:** 2026-08-06
**Version:** 0.16.0

## Purpose

Define the canonical set of templates Doctrina ships, the placeholder
syntax they use, and the per-agent adapters available at install time.
The CLI consumes this spec to drive `doctrina init` and the
`doctrina spec|change|decision|skill new` commands.

## Requirements (EARS)

### Ubiquitous

- The system shall provide templates under `.doctrina/templates/` for
  every artifact type Doctrina supports: root `AGENTS.md`, the
  `.doctrina/` skeleton, capability specs, change folder contents
  (proposal, tasks, design, spec delta), and ADRs.
- The system shall provide per-agent adapters under
  `.doctrina/templates/adapters/<agent>/` for each supported agent.
- The system shall provide a `hooks/pre-commit.sample` template
  under `.doctrina/templates/hooks/`, consumed by the
  `doctrina hooks install` command.
- The system shall provide a `spec-bug.md.template` under
  `.doctrina/templates/`, used by `doctrina spec new <cap> --bug`
  to scaffold bug-shaped specs that follow the Kiro
  current/expected/unchanged three-section pattern.
- The system shall provide a `hooks/watch.sample` template under
  `.doctrina/templates/hooks/`, a POSIX shell script wiring
  `doctrina validate` through a user-installed file watcher
  (such as `entr` or `fswatch`). The template is not
  auto-installed; users wire it into their dev setup by hand.
- The system shall provide a `skill.md.template` under
  `.doctrina/templates/`, used by `doctrina skill new <name>`
  to scaffold on-demand procedural memory files matching the
  `skills` capability spec.
- The system shall use the placeholder syntax `{{NAME}}` (double curly
  braces around an uppercase/digit/underscore token).
- The system shall reserve and document the canonical token set in the
  templates `README.md` so users and CLI authors share one vocabulary.
- The system shall treat an adapter file as a hub pointer only when its template declares the AGENTS_MD_PATH token; slash-command shims reach the hub through their parent pointer file and shall not be required to name it.
- The system shall define one canonical position for the doctrina:surface block, taken from the shipped AGENTS.md template, and shall use it for both `init` and `templates update`.
- The system shall hold one definition of the artifact categories a well-formed index.json carries, and shall use it both to write the index at init and to measure a project in `templates check`.
- The system shall resolve every template through a chain, per file: a template under the project's `.doctrina/templates/` wins, and anything absent falls back to the copy shipped with the installed CLI.
- The system shall require every command to declare a purpose and a when-trigger, and shall generate the AGENTS.md surface block from those declarations, organised by the moment the command is reached for.
- The system shall hold the generated surface block to a declared line budget, reporting an overrun as a finding rather than growing the block.
- The contract template shall carry Wiring, Selectors and Budgets tables, and a Values column on Environment, each documenting what the corresponding runtime check verifies.
- The spec template shall carry an optional `### Pipeline` block documenting that a step may only require what an earlier step produced.

### Event-driven

- When the CLI scaffolds an artifact, the system shall substitute every
  occurrence of every supplied token in a single pass.
- When the CLI is invoked with `--agent <name>`, the system shall install
  only the adapter matching `<name>`.
- When the CLI is invoked with `--agent all`, the system shall install
  every adapter under `templates/adapters/`.
- When `doctrina init --agent claude` or `--agent cursor` (or `--agent all`)
  runs, the system shall additionally install native slash commands for the
  core workflow (`work`, `next`, `context`, `status`, `why`) — under
  `.claude/commands/doctrina-*.md` for Claude Code and
  `.cursor/commands/doctrina-*.md` for Cursor — so the workflow is
  discoverable inside the agent, not only by the agent knowing to shell out
  to the CLI. Each command is a thin prompt that invokes the CLI, which stays
  the single source of truth.
- When `doctrina templates check` runs, the system shall verify each installed agent adapter (inventoried from the shipped adapter template tree) still references `AGENTS.md`, and shall report a finding with the fix when the pointer is gone.
- When an adapter is resolved by name, the system shall prefer a project-local directory at `.doctrina/templates/adapters/<name>/` over a bundled adapter of the same name, and shall report which source it used.
- When an adapter is resolved by name, the system shall prefer a project-local directory at `.doctrina/templates/adapters/<name>/` over a bundled adapter of the same name, and shall report which source it used.
- When `doctrina templates check` reports a finding, the system shall name the command that resolves that finding, or state that repair is manual.
- When `templates update` inserts a missing doctrina:surface block, the system shall place it at the canonical position rather than appending it, and a second run shall change nothing.
- When `templates update` previews a doctrina:surface change, the system shall show the differing lines, or the block body and its destination, rather than a one-line summary.
- When a scaffolding command uses a project template rather than the bundled one, the system shall say so.
- When `doctrina templates list` runs, the system shall label each template with the source it resolved from and mark a project file that shadows a bundled one.
- When a project is scaffolded or upgraded, the system shall write a marker-delimited agent-facing changelog naming only what alters agent behaviour in the installed version.

### State-driven

- While a target file already exists at the destination path, the system
  shall refuse to overwrite it unless `--force` is supplied.
- While a required token has neither a command-line value nor a defined
  default, the system shall prompt the user and refuse to scaffold
  silently with an empty value.

### Unwanted-behavior (must-not)

- The system shall not install adapters the user did not select.
- The system shall not modify files outside the project directory.
- The system shall not introduce conditional logic, loops, or includes
  into the template syntax. Anything richer is a CLI concern, not a
  template concern.
- The system shall not name a remedy that cannot resolve the finding it is attached to.
- The system shall not scaffold a project that immediately reports a pending template update.
- The system shall not require a project to vendor the whole template tree in order to override one file.
- The system shall not place a generated block inside another generated block; a marker comment ends the preceding section just as a heading does.
- A freshly scaffolded contract shall not fail its own `contract check`: placeholder rows are scaffolding, not declarations.

### Optional

- Where additional agents become relevant (Copilot, Gemini CLI, Windsurf),
  the system may add a new directory under `templates/adapters/<agent>/`
  without changing the substitution contract or existing adapters.

## Supported adapters (v0.1)

| Agent | Files installed | Notes |
|-------|-----------------|-------|
| `claude` | `CLAUDE.md` + `.claude/commands/doctrina-{work,next,context,status,why}.md` | `@AGENTS.md` pointer plus native slash commands for the core loop. |
| `codex` | none | OpenAI Codex CLI reads `AGENTS.md` natively. |
| `cursor` | `.cursor/rules/00-doctrina.mdc` + `.cursor/commands/doctrina-*.md` | `alwaysApply: true` rule plus native slash commands for the core loop. |
| `copilot` | `.github/copilot-instructions.md` | GitHub Copilot repository-level instructions; points at AGENTS.md. |
| `gemini` | `GEMINI.md` at project root | Gemini CLI native; points at AGENTS.md. |
| `aider` | `CONVENTIONS.md` at project root | Read-only context once wired in (`--read` / `.aider.conf.yml`); points at AGENTS.md. |
| `windsurf` | `.windsurfrules` at project root | Windsurf rules file; points at AGENTS.md. |
| `continue` | `.continue/rules/00-doctrina.md` | Continue.dev rules directory; points at AGENTS.md. |
| `amp` | none | Sourcegraph Amp reads `AGENTS.md` natively. |
| `devin` | none | Cognition Devin reads `AGENTS.md` natively. |
| `factory` | none | Factory AI reads `AGENTS.md` natively. |
| `jules` | none | Google Jules reads `AGENTS.md` natively. |

## Acceptance criteria

A repository's `.doctrina/templates/` directory is spec-compliant when:

1. Every file path listed in the v0 template inventory exists — proven
   by the inventory test in `packages/doctrina-cli/test/templates.test.js`.
2. Every template carries at least one `{{TOKEN}}` placeholder using only
   tokens from the canonical set — proven by the token-contract test in
   `packages/doctrina-cli/test/templates.test.js`.
3. Every adapter file is under 30 lines — enforced as an error by
   `packages/doctrina-cli/src/commands/validate.js`.
4. The canonical token set is enumerated with meaning and default for
   each token in `.doctrina/templates/README.md`; a template using an
   undocumented token fails `packages/doctrina-cli/test/templates.test.js`.
5. [verified] A broken adapter pointer is a named `templates check` finding — verified by `packages/doctrina-cli/test/integration.test.js`.
6. [verified] A project-local adapter is installable by name and overrides a bundled adapter of the same name — verified by `packages/doctrina-cli/test/integration.test.js`.
7. [verified] A project-local adapter is installable by name and overrides a bundled adapter of the same name — verified by `packages/doctrina-cli/test/integration.test.js`.
8. [verified] A fresh `doctrina init --agent <name>` passes `templates check` for every bundled adapter — verified by `packages/doctrina-cli/test/remedies.test.js`.
9. [verified] Every finding's printed remedy, executed verbatim, clears that finding — verified by `packages/doctrina-cli/test/remedies.test.js`.
10. [verified] A fresh `init` and an `upgrade --write` of a block-less tree produce the same section order, and a second upgrade is a no-op — verified by `packages/doctrina-cli/test/integration.test.js`.
11. [verified] The preview names the destination and shows the block content or the changed lines — verified by `packages/doctrina-cli/test/integration.test.js`.
12. [verified] A freshly initialised tree needs zero `templates update` operations and passes `templates check` — verified by `packages/doctrina-cli/test/integration.test.js`.
13. [verified] `init` writes every artifact category the schema declares, stamped with the running CLI version — verified by `packages/doctrina-cli/test/integration.test.js`.
14. [verified] A project-local template overrides the bundled one and its tokens still substitute, while a template with no local override falls back — verified by `packages/doctrina-cli/test/integration.test.js`.
15. [verified] An empty project templates directory behaves exactly as before the chain existed — verified by `packages/doctrina-cli/test/integration.test.js`.
16. [verified] Every command declares a purpose, a when-trigger, and a known moment, and the block carries those triggers within its declared budget — verified by `packages/doctrina-cli/test/commands.test.js`.
17. [verified] The agent-facing changelog is three to six agent-scoped bullets for the running version, written at init and refreshed by upgrade — verified by `packages/doctrina-cli/test/commands.test.js`, `packages/doctrina-cli/test/integration.test.js`.
18. [verified] A scaffolded contract passes `contract check` and reports its runtime surface as unchecked — verified by `packages/doctrina-cli/test/runtime-commands.test.js`.

## Out of scope for this spec

- The CLI command surface that consumes these templates (covered by the
  `cli` spec).
- The empirical A/B validation protocol (covered by the `validation` spec).
