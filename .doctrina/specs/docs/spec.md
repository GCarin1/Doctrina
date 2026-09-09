# Spec — Documentation

**Capability:** docs
**Status:** active
**Implementation:** implemented
**Realizes:** SC3, SC5
**Source:** `docs/**`, `scripts/check-docs.js`, `CHANGELOG.md`, `README*.md`
**Last updated:** 2026-08-06
**Version:** 0.6.0

## Purpose

Define the canonical layout, language policy, and structural conventions
for Doctrina's user-facing documentation. The CLI does not consume
this spec; humans and agents do.

## Requirements (EARS)

### Ubiquitous

- The system shall expose user-facing documentation under `docs/`.
- The system shall maintain English as the source-of-truth language
  for every documented topic.
- The system shall provide a one-to-one Portuguese translation of every
  English document, with identical filenames, under `docs/pt/`.
- The system shall keep every narrative documentation file under a
  soft cap of 250 lines to bound the lost-in-the-middle risk when an
  agent reads multiple docs in one context. Lookup references
  (`cli-reference.md`), consulted per-section rather than read
  linearly, are exempt from the cap.
- The system shall keep the documentation shape executable-checkable:
  `scripts/check-docs.js` (run by `doctrina verify`) checks parity,
  H1 shape, line caps, and the PT source note.
- The system shall include a single H1 at the top of every document.
- The system shall hold documentation to accuracy as well as shape: `scripts/check-docs.js` shall verify that every documented command resolves to the CLI catalog, that every flag documented in a reference flag table is declared by that command, that every relative link resolves, that every fenced block showing CLI output carries an explicit illustrative marker, and that paired EN and PT pages stay within a declared length ratio.
- The system shall reject a CLI reference that documents a command absent from the catalog, as well as a catalog command absent from the reference, so drift is caught in both directions.
- The system shall reject a README whose stated command or operation count differs from the catalog.
- The system shall check every stated count of the command surface and of the decision set against the catalog and the decisions directory that own them, in the root READMEs and in every Markdown file under `docs/`, in both languages.

### Event-driven

- When an EN doc is updated, the matching PT translation shall be
  updated in the same change. A change that touches one but not the
  other is incomplete.
- When a new topic earns a doc, both EN and PT files shall be added in
  the same change.
- When a command is removed from the CLI catalog or a flag is renamed, `scripts/check-docs.js` shall fail until the documentation follows.
- When the documentation gate runs, the system shall validate every project under examples/ against the installed CLI.

### State-driven

- While a PT doc would drift from its EN source, the PT doc shall
  carry a visible note at the top stating that EN is the source.

### Unwanted-behavior (must-not)

- The system shall not store user-facing prose in `.doctrina/`. Specs
  and ADRs are not documentation.
- The system shall not translate ADRs or capability specs into other
  languages. Those remain EN.
- The system shall not introduce a documentation site that requires a
  build step or a static-site generator. A zero-build client-side
  renderer that serves the existing Markdown straight from `docs/`
  (the shipped Docsify shell at `docs/index.html`) is the permitted
  exception: the Markdown stays the artifact, the site is a view.
- Site infrastructure files (`index.html`, `_sidebar.md`, `.nojekyll`,
  `assets/`) shall not carry documentation prose of their own; prose
  lives in the per-language Markdown files only.
- The system shall not treat filename parity as content parity; a page that has diverged in length from its counterpart shall be reported.

### Optional

- Where a doc benefits from a diagram, the diagram may be inlined as
  Mermaid in the same Markdown file.
- Where the project ships visual identity (logo candidates, marks),
  the assets may live under `docs/assets/` as plain SVG.

## Acceptance criteria

The repository's `docs/` is spec-compliant when (all five checked
mechanically by `scripts/check-docs.js`, wired into `doctrina verify`):

1. [verified] `docs/en/` and `docs/pt/` exist with identical filename
   sets — `scripts/check-docs.js`.
2. [verified] Each prose file carries exactly one H1; site
   infrastructure files (`docs/index.html`, `docs/_sidebar.md`,
   `docs/.nojekyll`, `docs/assets/`) are exempt — `scripts/check-docs.js`.
3. [verified] No narrative file exceeds 250 lines
   (`docs/en/cli-reference.md` is a lookup reference, exempt) —
   `scripts/check-docs.js`.
4. [verified] Every PT file states at the top that EN is the source —
   `scripts/check-docs.js`.
5. [verified] The two READMEs link to the docs trees: `README.md` to
   `docs/en/` and `README.pt.md` to `docs/pt/` — `scripts/check-docs.js`.
6. [verified] Every documented `doctrina <command>` resolves to the CLI catalog, and a page naming a command that does not exist fails the gate — `scripts/check-docs.js`, `packages/doctrina-cli/test/check-docs.test.js`.
7. [verified] Every flag documented in a `cli-reference.md` flag table is declared in that command's exported flag spec, via the catalog shared with the source-side test — `packages/doctrina-cli/src/lib/flag-catalog.js`, `packages/doctrina-cli/test/check-docs.test.js`.
8. [verified] Every relative link in the documented surfaces resolves; docsify router paths and fenced sample links are exempt — `packages/doctrina-cli/test/check-docs.test.js`.
9. [verified] Every fenced block showing CLI output carries an
   `<!-- illustrative -->` marker; invocation-only blocks do not need one —
   `packages/doctrina-cli/test/check-docs.test.js`.
10. [verified] Paired EN and PT pages stay within the declared length ratio, so a divergence filename parity cannot see is reported — `packages/doctrina-cli/test/check-docs.test.js`.
11. [verified] A reference section naming a command the catalog does not carry fails the docs gate — `scripts/check-docs.js` check 11, exercised by `packages/doctrina-cli/test/check-docs.test.js`.
12. [verified] A README stating the wrong command count fails the docs gate — `scripts/check-docs.js` check 12.
13. [verified] Every project under `examples/` validates against the installed CLI — the "Examples validate" job in `.github/workflows/ci.yml`.
14. [verified] An upgrade guide exists in both languages and states what `upgrade` does and does not touch — `docs/en/upgrading.md`, `docs/pt/upgrading.md`.
15. [verified] A stale operation count, a stale count in a page under `docs/`, and an ADR range that stops short of the highest decision on disk are each reported, and this repository's own counts agree with its catalog — verified by `packages/doctrina-cli/test/check-docs.test.js`.

## Out of scope for this spec

- Static-site generators or any documentation build pipeline.
- Translation of ADRs, specs, or `AGENTS.md`.
- API reference for CLI internals (the CLI is consumed via its command
  surface, covered by `cli-reference.md`).
