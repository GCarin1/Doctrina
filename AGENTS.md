# AGENTS.md — Doctrina

Operational source of truth for AI coding agents working in this
repository. Follows the open AGENTS.md standard.

## What this repo is



This repository uses the Doctrina framework for spec-driven, AGENTS.md
native multi-agent development. The full framework artifacts live under
`.doctrina/`.

## Working from intent (you drive; the human stays passive)

You — the AI agent — run the Doctrina commands. The human gives a brief
prompt and approves; do not make them run the CLI or hand-author artifacts.

- **Bootstrap.** If `.doctrina/intake.md` is `Status: pending`, the specs
  are not written yet: run `doctrina intake` and execute the printed
  playbook in one pass (fill `product.md`, derive capabilities, one EARS
  spec each, `doctrina clarify --all` + `doctrina validate`, then flip the
  intake to `Status: converted`). After conversion the specs are the only
  source of truth — never edit `intake.md` to change requirements.
- **Day-to-day.** Start every session with `doctrina prime` (gates, rules,
  open work in one read). Turn any request into a change with `doctrina
  work "<prompt>"` and follow the printed playbook (spec delta → tasks →
  implement → close). Preview a close with `doctrina change check <id>`;
  close with `doctrina close <id>`. Unsure what's next? `doctrina next`.
  Before compaction or handover: `doctrina handoff`. Ask the human only on
  genuine ambiguity.

<!-- doctrina:surface:begin — CLI-owned block, generated from the installed command catalog. Refreshed by `doctrina upgrade --write`; edits inside are overwritten. -->
## Doctrina command surface (generated — reach for these, don't hand-author)

Every operation of the installed CLI, grouped by workflow. The CLI
scaffolds from canonical templates and keeps `index.json` in sync, so
prefer it over writing artifacts by hand. Details: `doctrina --help`.

- **Start:** `doctrina init` · `doctrina intake` · `doctrina work "<prompt>" (--capability · --chore · --from-diff · --quiet)`
- **Author:** `doctrina spec new|list|set` · `doctrina change new|apply|archive|check|tick|diff|abandon` · `doctrina contract new|list|check` · `doctrina decision new|accept|land|supersede|list` · `doctrina skill new|list|sync|suggest` · `doctrina intent add|list` · `doctrina adapter list|add|remove`
- **Read / orient:** `doctrina prime (session start)` · `doctrina context [<cap>] --concat` · `doctrina show` · `doctrina search` · `doctrina status` · `doctrina next` · `doctrina why` · `doctrina handoff (before compaction/handover)` · `doctrina constitution`
- **Gates:** `doctrina analyze` · `doctrina clarify --all (--lang pt|en)` · `doctrina validate (--fix)` · `doctrina coverage --strict` · `doctrina trace --strict` · `doctrina review` · `doctrina verify` · `doctrina close <id...>` · `doctrina doctor`
- **Maintain:** `doctrina templates list|check|update` · `doctrina hooks install` · `doctrina index rebuild` · `doctrina watch` · `doctrina metrics` · `doctrina report` · `doctrina completion` · `doctrina upgrade --write`

Session bookends: `doctrina prime` to orient at session start;
`doctrina handoff` before compaction or handover. Continuous:
`doctrina watch`. Capture lessons: `doctrina skill suggest`.
<!-- doctrina:surface:end -->

## Stack and tooling

<!-- Replace with the project's actual stack. Keep this section short. -->
- Runtime:
- Package manager:
- Test runner:
- Linter / formatter:

## Commands

<!-- Use exact, copy-pasteable commands. Avoid prose. -->
```
# install
# build
# test
# lint
```

## Repository structure

<!-- Outline the top-level directories an agent needs to know about. -->

## Conventions and boundaries

- Specs in `.doctrina/specs/<capability>/spec.md` are the current truth.
- ADRs in `.doctrina/decisions/` are immutable; supersede instead of edit.
- Active change proposals live in `.doctrina/changes/<id>/`.
- Archived changes in `.doctrina/changes/archive/` are out of the default
  read path; consult only when explicitly debugging history.

## Artifact invariants (verbatim — `doctrina validate` enforces these)

Scaffold artifacts with the CLI (`doctrina decision new`, `doctrina work`),
which writes from the canonical templates. Do NOT hand-author these files
from memory. If you must write one by hand, match these exactly:

- **Metadata headers come in two forms — do not mix them up:**
  - ADRs, change proposals, and the intake use **list items**:
    `- **Status:** accepted`, `- **Date:** 2026-06-13`.
  - Specs use **bare bold** (no leading `- `):
    `**Status:** active`, `**Version:** 0.1.0`.
  Match the template for the artifact you are writing.
- **ADR filename** must be `NNNN-slug.md` — four digits, e.g.
  `0001-jwt-algorithm.md`. `ADR-001-...md` or `1-...md` is invisible to
  `doctrina decision accept`, the index, and the orphan check.
- **Change folder** at `.doctrina/changes/<id>/` must contain a file named
  exactly `proposal.md` (not `change.md`, not `README.md`). `tasks.md` and
  `design.md` are optional siblings.
- **Spec** lives at `.doctrina/specs/<capability>/spec.md` and its
  `**Version:**` header must equal the `version` recorded for it in
  `.doctrina/index.json`.
- **Every artifact on disk** must be registered in `.doctrina/index.json`,
  and every path in `index.json` must exist on disk. Update the index in
  the same change that adds or moves a file.

Always finish by running `doctrina validate` and resolving every `error:`
before considering work done.

## How to read context efficiently

`doctrina context [<capability>] --concat` assembles the read pack in one
call, in order: this `AGENTS.md` → `.doctrina/product.md` → the capability
spec → open `.doctrina/changes/<id>/` → `.doctrina/decisions/` filtered to
`Status: accepted`. Run it for ANY task, not only `doctrina work`; it skips
`changes/archive/` (history — read only when debugging it).

On demand only: if the task matches a skill in `.doctrina/skills/`, read its
`description:` / `when:` frontmatter; load the full body when the trigger fires.

Keep this file under 150 lines. Density beats prose. Use exact commands.

## Definition of done

A change is done when:
- All tasks in the change's `tasks.md` are checked.
- Deltas have been merged into affected spec files.
- The change folder has been moved to `.doctrina/changes/archive/`.
- Any architectural decisions are recorded as ADRs with `Status: accepted`.
- `.doctrina/index.json` has been updated.

## What never goes in this file

Tutorials, project history, secrets, generated content, session notes.
