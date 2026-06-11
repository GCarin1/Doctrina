# Spec — Templates and Scaffolding

**Capability:** templates
**Status:** active
**Last updated:** 2026-06-03
**Version:** 0.7.0

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

### Event-driven

- When the CLI scaffolds an artifact, the system shall substitute every
  occurrence of every supplied token in a single pass.
- When the CLI is invoked with `--agent <name>`, the system shall install
  only the adapter matching `<name>`.
- When the CLI is invoked with `--agent all`, the system shall install
  every adapter under `templates/adapters/`.

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

### Optional

- Where additional agents become relevant (Copilot, Gemini CLI, Windsurf),
  the system may add a new directory under `templates/adapters/<agent>/`
  without changing the substitution contract or existing adapters.

## Supported adapters (v0.1)

| Agent | Files installed | Notes |
|-------|-----------------|-------|
| `claude` | `CLAUDE.md` at project root | Uses `@AGENTS.md` import; under 30 lines. |
| `codex` | none | OpenAI Codex CLI reads `AGENTS.md` natively. |
| `cursor` | `.cursor/rules/00-doctrina.mdc` | `alwaysApply: true`; points at `AGENTS.md`. |
| `copilot` | `.github/copilot-instructions.md` | GitHub Copilot repository-level instructions; points at AGENTS.md. |
| `gemini` | `GEMINI.md` at project root | Gemini CLI native; points at AGENTS.md. |
| `aider` | `CONVENTIONS.md` at project root | Aider reads CONVENTIONS.md as read-only context; points at AGENTS.md. |
| `windsurf` | `.windsurfrules` at project root | Windsurf rules file; points at AGENTS.md. |
| `continue` | `.continue/rules/00-doctrina.md` | Continue.dev rules directory; points at AGENTS.md. |
| `amp` | none | Sourcegraph Amp reads `AGENTS.md` natively. |
| `devin` | none | Cognition Devin reads `AGENTS.md` natively. |
| `factory` | none | Factory AI reads `AGENTS.md` natively. |
| `jules` | none | Google Jules reads `AGENTS.md` natively. |

## Acceptance criteria

A repository's `.doctrina/templates/` directory is spec-compliant when:

1. Every file path listed in the v0 template inventory exists.
2. Every template carries at least one `{{TOKEN}}` placeholder using only
   tokens from the canonical set.
3. Every adapter file is under 30 lines.
4. The templates `README.md` enumerates the canonical token set with
   meaning and default for each.

## Out of scope for this spec

- The CLI command surface that consumes these templates (covered by the
  `cli` spec).
- The empirical A/B validation protocol (covered by the `validation` spec).
