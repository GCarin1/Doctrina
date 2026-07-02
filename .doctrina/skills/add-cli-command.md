---
name: add-cli-command
description: Add or change a doctrina CLI command or subcommand without leaving any surface (help, hub, docs, tests) behind.
when: The task adds, renames, or removes a CLI command/subcommand, or changes the flags or summary of an existing one.
---

# Skill — add-cli-command

## When to use this skill

- Adding a new `doctrina <command>` or a subcommand to an existing one.
- Renaming/removing a command, or changing its flags or summary line.

## Procedure

The surface is named in exactly one place; everything else is generated
or gate-checked from it. Touch the steps in this order:

1. Implement the handler in
   `packages/doctrina-cli/src/commands/<command>.js` (subcommands go in
   the existing file's dispatch switch). Update its `help` export.
2. Register the operation in `OPERATIONS` in
   `packages/doctrina-cli/src/lib/commands.js` (workflow order, not
   alphabetical). Top-level `--help` is generated from this list. A new
   top-level command also goes in `COMMAND_NAMES` and in the imports +
   `COMMANDS` map of `packages/doctrina-cli/src/index.js`.
3. Add the command line to the `## Commands` block of the root
   `AGENTS.md` — the hub agents read first. It is capped at 150 lines:
   fold read-only siblings into a comment (`` `spec list` lists them ``)
   rather than exceeding the cap.
4. Document it in `docs/en/cli-reference.md` AND `docs/pt/cli-reference.md`
   in the same change (see the `keep-docs-en-pt-parity` skill): a
   `## doctrina <op>` heading in backticks, a one-paragraph description,
   a fenced example, a flags table.
5. Add/extend tests: behaviour in
   `packages/doctrina-cli/test/integration.test.js`; the drift tests in
   `packages/doctrina-cli/test/commands.test.js` (catalog ↔ dispatch ↔
   help ↔ docs) fail loudly if steps 2–4 were skipped — run them first
   when in doubt.
6. Update the operation count in `docs/en/README.md` / `docs/pt/README.md`
   ("27 commands, NN operations") and the surface list in
   `.doctrina/specs/cli/spec.md` (gate semantics belong in
   `.doctrina/specs/gates/spec.md`). Then `doctrina spec set cli --bump minor`.
7. Gates: `node --test` inside `packages/doctrina-cli/`, then
   `doctrina validate` (AGENTS.md drift gate) at the repo root.

## Anti-patterns

- Shipping a working subcommand that `--help` never mentions. It
  happened: `spec set` and `change abandon` were implemented, spec'd,
  and invisible in help/AGENTS.md/docs for multiple releases — nobody
  could discover them.
- Documenting a command in a diagram (`docs/en/flow.md`) but giving it
  no cli-reference section: readers see it exists but cannot learn it.
- Updating the EN docs and leaving PT for "later".

## Related material

- `packages/doctrina-cli/src/lib/commands.js` — the canonical surface.
- `.doctrina/specs/cli/spec.md` — the surface contract.
- ADR 0010 (adoption ergonomics); the v0.10.0 CHANGELOG entry
  (hub-freshness gate).
