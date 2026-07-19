# Change 0003-hollow-change-teeth-and-adapter-pointer-check — hollow change teeth and adapter pointer check

- **Status:** applied
- **Applied:** 2026-07-19
- **Date:** 2026-07-19
- **Owner:** agent session 2026-07-19
- **Affects specs:** cli, templates

## Why

Hollow-change teeth (analyze/validate/tick refuse scaffold placeholders) and adapter-pointer check in templates check

## What

- `analyze` hard-fails on scaffold placeholder tasks (empty `- [ ]`,
  checked or not) — `change check` and `close` inherit the refusal.
- `validate` warns per open change: "opened but never planned".
- `change tick` refuses to tick a textless box (all-or-nothing) and
  marks placeholders in its listing; the work playbook states the order
  (plan BEFORE implementing).
- `templates check` verifies each installed adapter still references
  AGENTS.md (inventory = shipped adapter template tree).
- Tests: analyze/validate/tick placeholder paths, adapter pointer check;
  helpers now plan tasks before ticking (they mirrored the hollow flow).
- Docs: cli-reference EN/PT (analyze, change tick/check, templates
  check, upgrade adapters note); CHANGELOG 0.13.0.

## Scope boundaries

- Proposal `## What`/`## Scope` emptiness stays advisory — the
  enforcement point is tasks.md, the actionable plan.
- Adapters themselves are not rewritten by upgrade; they are pointers
  and only the pointer property is checked.

## Verification

<!--
How you will know the change is correctly applied. Use checkboxes: every
box here is a claim that must be PROVEN before the change is done.
`doctrina change archive` refuses to archive while any box below is
unchecked (pass --force to archive anyway and record the gap). Distinguish
"task marked done" from "verification passed" — link the evidence.
-->

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

<!-- List unresolved decisions. Empty if none. -->
