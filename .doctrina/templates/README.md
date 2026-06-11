# Doctrina templates

Canonical scaffolds consumed by the `doctrina` CLI.

## Placeholder syntax

Templates use `{{TOKEN}}` — double curly braces around an uppercase,
digit, and underscore token. Substitution is a single global string
replace. No conditionals, loops, or includes.

## Canonical tokens

| Token | Meaning | Default if not supplied |
|-------|---------|-------------------------|
| `{{PROJECT_NAME}}` | Human-readable project name | basename of target directory |
| `{{PROJECT_DESCRIPTION}}` | One-sentence description | empty string |
| `{{DATE}}` | YYYY-MM-DD of init or artifact creation | system date |
| `{{CAPABILITY}}` | Slug for a new capability spec | required, no default |
| `{{CHANGE_ID}}` | Change folder identifier | required, no default |
| `{{CHANGE_TITLE}}` | Short change title | required, no default |
| `{{DECISION_NUMBER}}` | Zero-padded ADR number (e.g. `0007`) | next available |
| `{{DECISION_TITLE}}` | ADR title | required, no default |
| `{{DECISION_SLUG}}` | kebab-case slug derived from `{{DECISION_TITLE}}` | derived |
| `{{AGENTS_MD_PATH}}` | Path to root `AGENTS.md` from the adapter location | per adapter |

CLI authors and template authors share this vocabulary. Adding a token
requires extending the templates spec at `.doctrina/specs/templates/spec.md`.

## Inventory (v0)

```
README.md                                  this file
AGENTS.md.template                         root rules for the target repo
doctrina/                                  the .doctrina/ skeleton
  product.md.template
  index.json.template
  specs/.gitkeep
  changes/.gitkeep
  changes/archive/.gitkeep
  decisions/.gitkeep
  skills/.gitkeep
  templates/.gitkeep
spec.md.template                           one capability spec (EARS)
spec-bug.md.template                       bug-shape capability spec
skill.md.template                          one on-demand skill
change/
  proposal.md.template
  tasks.md.template
  design.md.template
  spec-delta.md.template
decision.md.template                       one ADR (Nygard/MADR)
hooks/
  pre-commit.sample                        installed by `doctrina hooks install`
  watch.sample                             on-save validation wrapper (manual wiring)
adapters/
  claude/CLAUDE.md.template
  codex/README.md
  cursor/.cursor/rules/00-doctrina.mdc.template
  copilot/.github/copilot-instructions.md.template
  gemini/GEMINI.md.template
  aider/CONVENTIONS.md.template
  windsurf/.windsurfrules.template
  continue/.continue/rules/00-doctrina.md.template
  amp/README.md
  devin/README.md
  factory/README.md
  jules/README.md
```

## Adapter strategy

| Agent | What gets installed | Why |
|-------|--------------------|-----|
| `claude` | `CLAUDE.md` at project root with `@AGENTS.md` import | Claude Code reads `CLAUDE.md` natively and supports `@file` includes. |
| `codex` | nothing | OpenAI Codex CLI reads `AGENTS.md` natively; an adapter file would only add drift surface. |
| `cursor` | `.cursor/rules/00-doctrina.mdc` with `alwaysApply: true` | Cursor's `.mdc` rules live in a dedicated directory; the file is a thin pointer. |
| `copilot` | `.github/copilot-instructions.md` | GitHub Copilot's repository-level custom instructions path. |
| `gemini` | `GEMINI.md` at project root | Gemini CLI's native context file. |
| `aider` | `CONVENTIONS.md` at project root | Aider reads CONVENTIONS.md as cached read-only context. |
| `windsurf` | `.windsurfrules` at project root | Windsurf's rules file convention. |
| `continue` | `.continue/rules/00-doctrina.md` | Continue.dev's rules directory. |
| `amp` / `devin` / `factory` / `jules` | nothing | AGENTS.md-native (same posture as `codex`); the directory marks the support contract and gives future per-agent affordances a home. |

Adapter files stay under 30 lines so they cannot meaningfully drift from
`AGENTS.md` and so they do not pay a noticeable per-turn token tax.
