# Change 0015-packed-install-harness — End-to-end harness that runs the CLI the way a user installs it

- **Status:** applied
- **Applied:** 2026-08-06
- **Date:** 2026-08-06
- **Owner:** audit remediation v2
- **Affects specs:** validation

## Why

Audit item M6, and the reason three corrections existed at all. The test
suite runs the CLI from its own repository, where `locateTemplatesDir()`
resolves to Doctrina's own `.doctrina/`, where adapters are already present
and linted, and where `index.json` is the repo's own rather than one `init`
just wrote. C1, C2 and C5 were all invisible from there.

## What

- `scripts/e2e-packed.mjs`: packs the tarball, installs it outside the
  repo, and drives a real project through init → spec new → work → delta →
  check → close → archive with the INSTALLED binary, asserting `validate`,
  `templates check` and `doctor` at each step; then installs each of the
  twelve adapters into its own project and checks it.
- `--repo <path>` points the harness at another checkout.
- CI job on Linux and Windows; `npm run test:e2e` in the package.
- Docs EN+PT in `ci.md`.

**The acceptance criterion, met literally.** Run against the commit before
the fixes (`--repo` at a detached worktree of 516049b), the harness
reports: the fresh project needing a scaffold update (C5), `metrics`
erroring on a repo with no commits (C8), `change apply` accepting an
unplanned change (C6), `adapter add` not existing and `init --force`
destroying authored content (C1), and `init --agent claude` failing
`templates check` (C2). Against the fixed tree, 43 checks pass.

## Scope boundaries

- The harness is a separate script, not part of `node --test`: it packs and
  installs, which is far too slow for the inner loop.
- Generating the `examples/` trees from the harness is D5, not this change.
- macOS is not in the matrix: the audit asked for Linux and Windows, and
  the existing unit matrix already covers macOS.

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
