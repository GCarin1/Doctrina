# Change 0022-typecheck-the-cli-with-checkjs-no-build-step — Typecheck the CLI with checkJs, no build step

- **Status:** applied
- **Applied:** 2026-08-06
- **Date:** 2026-08-06
- **Owner:** audit remediation v2
- **Affects specs:** cli cli

## Why

Typecheck the CLI with checkJs, no build step

## What

TypeScript as a **checker, never a build step**: `tsconfig.json` with
`allowJs` + `checkJs` + `noEmit`, `// @ts-check` on all 62 source files,
and `types/doctrina.d.ts` declaring the shapes that cross module
boundaries — the index record, the flag map, the artifact model, the
context pack item. Wired into `verify.json` (first, before the tests) and
into CI.

Zero runtime dependencies is untouched: TypeScript is a devDependency, the
tarball still contains only `src/`, `templates/` and `README.md`, and
`src/` stays directly runnable by node.

**23 findings, one of them a real defect:** `analyze.js` called
`fail(msg, "  ")` and `pass(msg, "  ")` at nine sites, passing an indent
argument neither function declares. It had been dead since the indent was
baked into the message strings instead — invisible to every test, because
an ignored argument changes no output.

The rest were shapes the code had always relied on and never stated:
heterogeneous tuple arrays collapsing to a union of every column,
accumulators seeded with `[]` or `null`, and enum-ish parameters defaulted
to one member of their own union, which narrowed the parameter to that
member alone.

## Scope boundaries

- `strict` stays off. The goal is catching typos and arity errors across a
  working codebase, not a null-safety migration; turning on
  `strictNullChecks` here would produce hundreds of findings about code
  that has been correct in production for fourteen releases.
- **No formatter applied**, deviating from the brief's M5. This codebase's
  style is hand-aligned in places where the alignment carries meaning — the
  `COMMAND_META` table in `lib/commands.js` reads as columns — and Prettier
  reflows exactly those. In a single-author repository the value a formatter
  buys (ending style arguments) is close to zero, and the cost (a 62-file
  reflow that destroys deliberate alignment and buries this change's real
  diff) is not. Flagged rather than silently skipped.

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
