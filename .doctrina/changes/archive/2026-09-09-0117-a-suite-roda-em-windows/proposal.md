# Change 0117-a-suite-roda-em-windows — a suite roda em Windows

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** validation

## Why

a suite de testes assume terminadores LF em fixtures e comparacoes byte-identical, mas o checkout em Windows tem 519 dos 730 arquivos versionados em CRLF porque o repositorio nao declara politica de fim de linha, entao o gate local nao roda nesta maquina e nenhum close consegue atestar nada
## What

Nine test files stop assuming LF. No product code changes: the CLI is
already line-ending agnostic — `doc-model` splits on `/?
/` throughout.
What was not agnostic were the tests ABOUT it.

- `check-docs.test.js` built its repo root from `new URL(...).pathname`,
  which is `/C:/Users/...` on Windows, so `path.resolve` produced
  `C:C:Users...`. Every other test file already used `fileURLToPath`.
- `playbooks.test.js` and `gate-sequences.test.js` compared LF stdout
  against a CRLF fixture. Terminators are normalised on both sides; what
  those tests pin is the text.
- `a-recommendation-states-its-cost.test.js` renamed two headings with
  `.replace("## Commands
", ...)`, which matched nothing on CRLF — so the
  fixture renamed neither heading and all five cases measured a project
  missing zero sections. It was asserting against its own no-op.
- `an-active-spec-says-how-to-prove-it.test.js` and
  `a-filter-that-matches-nothing.test.js` emptied a criteria section with a
  `
`-anchored pattern, so the section was never emptied.
- `change-title.test.js` and `init-intake.test.js` split on `"
"`, leaving
  a trailing `` on every line.

Measured on this checkout: 519 of 730 versioned files arrive CRLF, because
the repository declares no line-ending policy. The suite went 765/18 to
765+/3, and the three that remain belong to another session's uncommitted
edits, not to this change.

## Scope boundaries

- Adds no `.gitattributes` and renormalises nothing. That is the real root cause and the right fix, but it rewrites 519 files — hostile to run while another session has uncommitted work in the same tree. It gets its own change.
- Changes no product code. Every fix is in a test that was measuring its own no-op.
- Does not touch the three failures owned by the parallel session (`spec-ops`, `doctor-in-process`, and the index drift on change 0102).

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] The nine repaired files pass on this CRLF checkout.
- [x] No file under `src/` is modified by this change.
- [x] A fixture that renames or empties a section is asserted to have actually done so, not trusted.

## Open questions

- `.gitattributes` with `* text=auto eol=lf` plus a renormalising commit would make all of this structural instead of nine local repairs. Deferred only because of the concurrent session; worth opening next.
- Nothing stops the next test from being written LF-only. A lint (no bare `.split("
")` and no `
`-anchored replace in `test/`) would hold it, and is not in this change.
