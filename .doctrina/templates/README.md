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
| `{{SKILL_NAME}}` | Slug for a new on-demand skill | required, no default |
| `{{CONTRACT_NAME}}` | Slug for a new integration contract | required, no default |
| `{{FRAMEWORK_VERSION}}` | Version of the CLI that scaffolded/stamped the tree | running CLI version |
| `{{AGENTS_MD_PATH}}` | Path to root `AGENTS.md` from the adapter location | per adapter |

CLI authors and template authors share this vocabulary. Adding a token
requires extending the templates spec at `.doctrina/specs/templates/spec.md`.

### Playbook tokens

The playbooks under `playbooks/` carry the variable parts of the procedure
the agent executes. Each is PRE-RENDERED by the CLI into a plain string, so
the template stays a document rather than a language with conditionals and
loops in it.

| Token | Meaning | Default if not supplied |
|-------|---------|-------------------------|
| `{{TITLE}}` | "Work playbook" or "Backfill playbook" | required in `work` |
| `{{PROMPT}}` | The prompt the change was opened from, verbatim | required |
| `{{FROM_DIFF_NOTE}}` | The code-first note, on `--from-diff` | empty |
| `{{THIN_WARNING}}` | The thin-prompt clarification block | empty |
| `{{CAPABILITY_BLOCK}}` | The pinned capability, the ranked hints, or "no match" | required in `work` |
| `{{DIFF_MATCHES}}` | Capabilities the working tree touched | empty |
| `{{STEP3_INTRO}}` | The delta step's opening, pinned or not | required in `work` |
| `{{FROM_DIFF_DELTA_NOTE}}` | The backfill caveat on writing the delta | empty |
| `{{MISSING_SPECS_WARNING}}` | Warning that `.doctrina/specs/` is absent | empty |

A line holding NOTHING but one token whose value is empty is removed rather
than left blank, which is what lets the optional blocks above be plain tokens.

Colour is marked inline and expanded before substitution, so a token's value
can never inject it:

| Markup | Renders as |
|--------|-----------|
| `[[c]]...[[/c]]` | cyan — a command to run |
| `[[g]]...[[/g]]` | gray — commentary |
| `[[b]]...[[/b]]` | bold — a heading |
| `[[y]]...[[/y]]` | yellow — a warning |

## Inventory (v0)

```
README.md                                  this file
playbooks/work.md.template                 the work / backfill playbook
playbooks/chore.md.template                the spec-less chore playbook
playbooks/bootstrap.md.template            the intake -> specs playbook
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
contract.md.template                       one integration contract (ports/env/interfaces)
hooks/
  pre-commit.sample                        installed by `doctrina hooks install`
  watch.sample                             on-save validation wrapper (manual wiring)
adapters/
  claude/CLAUDE.md.template
  claude/.claude/commands/doctrina-*.md.template   native slash commands (core loop)
  codex/README.md
  cursor/.cursor/rules/00-doctrina.mdc.template
  cursor/.cursor/commands/doctrina-*.md.template   native slash commands (core loop)
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
| `aider` | `CONVENTIONS.md` at project root | Read-only context once wired in (`aider --read CONVENTIONS.md`, or `read:` in `.aider.conf.yml`). |
| `windsurf` | `.windsurfrules` at project root | Windsurf's rules file convention. |
| `continue` | `.continue/rules/00-doctrina.md` | Continue.dev's rules directory. |
| `amp` / `devin` / `factory` / `jules` | nothing | AGENTS.md-native (same posture as `codex`); the directory marks the support contract and gives future per-agent affordances a home. |

Adapter files stay under 30 lines so they cannot meaningfully drift from
`AGENTS.md` and so they do not pay a noticeable per-turn token tax.
