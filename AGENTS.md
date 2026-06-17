# AGENTS.md — Doctrina

Operational source of truth for AI coding agents working in this repository.
This file follows the open AGENTS.md standard (Linux Foundation / Agentic AI Foundation).

## What this repo is

Doctrina is a spec-driven, AGENTS.md-native framework for multi-agent AI development.

- Brand: Doctrina (Latin: "doctrine, teaching")
- Distribution: npm CLI — package `doctrina-cli`, binary `doctrina`
  (`npx doctrina-cli <command>` or, after global install, `doctrina <command>`)
- Targets: 12 AGENTS.md-aware agents (Claude Code, OpenAI Codex CLI, Cursor,
  GitHub Copilot, Gemini CLI, Aider, Windsurf, Continue, Amp, Devin, Factory, Jules)
- Languages: documentation EN primary, PT translated
- Status: v0.3.0 — released

## Stack and tooling

- Runtime: Node.js >= 20.12
- Package manager: npm workspaces (monorepo)
- License: MIT
- No build step (pure Markdown + Node.js stdlib CLI, zero runtime deps)

## Commands

```
npx doctrina-cli init                       # scaffold .doctrina/ + AGENTS.md (--intake <file> stores full intent)
npx doctrina-cli intake <file>              # store full description verbatim; print bootstrap playbook
npx doctrina-cli work "<prompt>"            # brief prompt -> scaffolded change + guided work playbook
npx doctrina-cli spec new <cap>             # create a new capability spec (--bug for bug-shape)
npx doctrina-cli spec list                  # list specs with version, status, size
npx doctrina-cli change new <id> "<title>"  # open a change proposal
npx doctrina-cli change apply <id>          # apply spec deltas (ADDED/REMOVED auto, MODIFIED manual)
npx doctrina-cli change archive <id>        # archive an applied change
npx doctrina-cli change diff <id>           # preview spec deltas (line diff for MODIFIED)
npx doctrina-cli decision new "<title>"     # create the next sequential ADR
npx doctrina-cli decision accept <num>      # flip a proposed ADR to accepted
npx doctrina-cli decision supersede <num>   # supersede an existing ADR
npx doctrina-cli decision list              # list ADRs with status, date, title
npx doctrina-cli skill new <name>           # scaffold an on-demand procedural-memory skill
npx doctrina-cli skill list                 # list skills with descriptions
npx doctrina-cli skill sync                 # sync skill frontmatter descriptions into index.json
npx doctrina-cli analyze <change-id>        # inspect a change folder before applying
npx doctrina-cli clarify <path>             # smell-test a Markdown file for ambiguity (--all: whole tree)
npx doctrina-cli context [<cap>]            # print the context pack in read order (--concat: contents)
npx doctrina-cli search <term>              # search artifacts, grouped by category
npx doctrina-cli validate                   # schema + structural checks
npx doctrina-cli coverage                   # acceptance criteria with linked evidence (--strict gates)
npx doctrina-cli verify                     # run project-declared typecheck/test/build (the real gate)
npx doctrina-cli contract new <name>        # own ports/env/interfaces; `contract check` validates them
npx doctrina-cli templates list             # list templates shipped by the CLI
npx doctrina-cli templates check            # compare project against recommended template shape
npx doctrina-cli templates update           # additive fixer for check findings (preview; --write applies)
npx doctrina-cli hooks install              # install the pre-commit hook
npx doctrina-cli index rebuild              # regenerate index.json from the files (--check for CI)
npx doctrina-cli next                       # print the recommended next workflow actions
npx doctrina-cli metrics                    # local git-derived adoption metrics (no network)
```

## Repository structure

```
/AGENTS.md                          this file — root rules (portable)
/README.md /README.pt.md            public-facing pitch (EN + PT)
/CHANGELOG.md /CONTRIBUTING.md /SECURITY.md   policy
/LICENSE                            MIT
/package.json                       monorepo root, workspaces
/.doctrina/                         framework artifacts
  product.md                        vision, scope, target users
  specs/<capability>/spec.md        current truth (EARS requirements)
  changes/<id>/                     active change proposals
  changes/archive/                  applied changes (episodic memory)
  decisions/NNNN-title.md           immutable ADRs (Nygard format)
  contracts/<name>.md               integration/runtime surface (ports, env, interfaces)
  skills/<slug>.md                  on-demand procedural memory (optional)
  templates/                        scaffolding consumed by the CLI
  verify.json                       project-declared build/verify checks (doctrina verify)
  index.json                        artifact metadata
/docs/en /docs/pt                   bilingual user-facing docs
/examples/                          two reference projects (Python FastAPI, TypeScript Express)
/packages/doctrina-cli/             the npm CLI source
/scripts/bench.js                   synthetic performance harness
```

## Conventions and boundaries

- Specs use EARS (Easy Approach to Requirements Syntax) for requirements.
- ADRs are **immutable** once accepted. To change a decision, write a new ADR
  and mark the old one `Status: superseded by NNNN` with bidirectional links.
- Active changes live in `.doctrina/changes/<id>/`. Applied changes are moved
  to `.doctrina/changes/archive/YYYY-MM-DD-<id>/` and DROPPED from default read path.
- Single linear orchestrator. No parallel multi-agent writing.
  See `.doctrina/decisions/0004-single-linear-orchestrator.md`.
- No `memory/` folder. See `.doctrina/decisions/0003-defer-memory-folder.md`.
- Do NOT introduce a runtime database, vector store, or RAG.
  Files in git are the source of truth.
- Do NOT translate file paths, command names, or code identifiers. Doctrina is
  EN-primary; PT docs are translations of EN, never the reverse.
- Framework evolution (this repo's own changes) uses Conventional Commits, not
  `doctrina change new`. The change workflow is for projects that USE Doctrina.

## How to read context efficiently

When working on a change:
1. Read this AGENTS.md.
2. Read `.doctrina/product.md`.
3. Read the relevant `.doctrina/specs/<capability>/spec.md`.
4. Read open `.doctrina/changes/<id>/` if any are in progress.
5. Read `.doctrina/decisions/` filtered by `Status: accepted`.
6. If the task matches a skill in `.doctrina/skills/`, load the relevant
   skill on demand (read its `description:` / `when:` frontmatter first;
   load the full body only when the trigger fires).
7. Do NOT read `.doctrina/changes/archive/` unless explicitly debugging history.

Keep this file under 150 lines. Density beats prose. Use exact commands, not advice.

## Definition of done

A change is done when:
- All `tasks.md` items in the change folder are checked (closing steps too).
- Declared verification passed: `doctrina verify` is green and the affected
  spec's acceptance criteria are met and cite their evidence
  (`doctrina coverage`). `doctrina change archive` refuses to archive while
  tasks or the proposal's `## Verification` are unchecked.
- Delta has been merged into the affected `specs/<capability>/spec.md`.
- The change folder has been moved to `changes/archive/YYYY-MM-DD-<id>/`.
- Any new architectural decisions are recorded as ADRs with `Status: accepted`.
- `.doctrina/index.json` has been updated with new artifact metadata.
- Commit message references the change id.

## What never goes in this file

Tutorials, prose explanations, project history, secrets, generated content,
session-specific notes. Those belong in `docs/`, ADRs, or change folders.
