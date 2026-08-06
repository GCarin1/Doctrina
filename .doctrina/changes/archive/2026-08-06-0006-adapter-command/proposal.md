# Change 0006-adapter-command — Adapter command: adding an agent stops destroying project content

- **Status:** applied
- **Applied:** 2026-08-06
- **Date:** 2026-08-06
- **Owner:** audit remediation v2
- **Affects specs:** cli, templates

## Why

Audit item C1 — data loss, verified against a packed install. There was no
command to add an agent adapter to an existing project; `init` refuses to
run twice, so `init --agent <name> --force` was the only path, and it
replaced `.doctrina/product.md` with a blank template and regenerated
`AGENTS.md`, discarding every hand-authored rule. Exit 0, no warning.

## What

- `doctrina adapter list|add|remove` (`lib/adapters.js`, `commands/adapter.js`),
  strictly additive, with three reported states and custom-adapter support.
- `init --force` refuses to overwrite authored `AGENTS.md` /
  `product.md`, names them, and points at `adapter add`;
  `--overwrite-content` is the explicit discard.
- Pristine is decided by template SHAPE, so a re-init under a different
  project name is still recognised as pristine.
- ADR 0016; tests for every acceptance criterion; docs EN+PT
  (cli-reference `adapter` section, `init` flags, adapters page).

## Scope boundaries

- The bundled adapter templates' own content is untouched here; the four
  Claude and four Cursor command files that fail the pointer check are C2.
- Generalising the resolution chain to every template kind is M1; this
  change wires it for adapters only.
- The audit cited 34 `init --force` suggestions; the tree carries one, in
  `templates check`, and C2 replaces it.

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

None.
