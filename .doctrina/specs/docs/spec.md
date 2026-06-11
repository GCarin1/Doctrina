# Spec — Documentation

**Capability:** docs
**Status:** active
**Last updated:** 2026-06-11
**Version:** 0.2.0

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
- The system shall keep every documentation file under a soft cap of
  250 lines to bound the lost-in-the-middle risk when an agent reads
  multiple docs in one context.
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

The repository's `docs/` is spec-compliant when:

1. `docs/en/` and `docs/pt/` exist with identical filename sets.
2. Each prose file carries exactly one H1 (site infrastructure files —
   `index.html`, `_sidebar.md`, `.nojekyll`, `assets/` — are exempt).
3. No file exceeds 250 lines.
4. Every PT file states at the top that EN is the source.
5. The two READMEs link to `docs/en/` and `docs/pt/`.

## Out of scope for this spec

- Static-site generators or any documentation build pipeline.
- Translation of ADRs, specs, or `AGENTS.md`.
- API reference for CLI internals (the CLI is consumed via its command
  surface, covered by `cli-reference.md`).
