# Spec — Documentation

**Capability:** docs
**Status:** active
**Implementation:** implemented
**Realizes:** SC3
**Last updated:** 2026-07-02
**Version:** 0.3.0

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

### Event-driven

- When an EN doc is updated, the matching PT translation shall be
  updated in the same change. A change that touches one but not the
  other is incomplete.
- When a new topic earns a doc, both EN and PT files shall be added in
  the same change.

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

## Out of scope for this spec

- Static-site generators or any documentation build pipeline.
- Translation of ADRs, specs, or `AGENTS.md`.
- API reference for CLI internals (the CLI is consumed via its command
  surface, covered by `cli-reference.md`).
