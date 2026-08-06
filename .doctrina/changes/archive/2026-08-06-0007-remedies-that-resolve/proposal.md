# Change 0007-remedies-that-resolve — Adapter pointer check targets hub pointers; every remedy resolves its finding

- **Status:** applied
- **Applied:** 2026-08-06
- **Date:** 2026-08-06
- **Owner:** audit remediation v2
- **Affects specs:** templates, gates

## Why

Audit item C2, verified on a packed install: `doctrina init --agent
claude` followed by `doctrina templates check` exited 1 with four
findings, and both remedies the CLI offered were dead ends. `init --agent
claude --force` regenerates the identical file; `templates update --write`
is additive over AGENTS.md / product.md / index.json and never touches
adapters. Two commands named as fixes, neither connected to the finding
by any code path.

The check I shipped in 0.13.0 caused this: it demanded the literal string
`AGENTS.md` in every adapter file.

## What

**Which side was wrong: the check.** A slash-command shim
(`.claude/commands/doctrina-status.md`) is a prompt that invokes the CLI,
not a router to the hub; it reaches AGENTS.md through its parent
`CLAUDE.md`. Requiring it to name the hub was cargo-culting. Pointer-hood
is now declared by the template through the `{{AGENTS_MD_PATH}}` token —
exactly the seven root adapter files use it.

- `lib/adapters.js`: `isHubPointer()`.
- `templates check`: findings become structured records carrying an
  executable remedy; the adapter finding's remedy is
  `doctrina adapter add <name> --force`, which rewrites that exact file.
- `doctor`: the template row reports the real findings and their own
  remedies instead of a generic "sections missing".
- `test/remedies.test.js`: seeds each finding, executes the remedy the
  CLI printed, asserts it clears; plus a fresh-init pass for all twelve
  adapters.
- Docs EN+PT: pointer-vs-shim semantics and the remedy contract.

## Scope boundaries

- The adapter templates themselves are unchanged — the shims were always
  correct.
- The remedy contract is enforced for `templates check` and the `doctor`
  row that fronts it; extending it to every other command's hints is
  follow-on work, not this change.

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
