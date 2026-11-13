---
name: read-the-grammar-through-the-document-model
description: "Read checkboxes, headers, sections and comments of a .doctrina artifact through lib/doc-model.js instead of a new regex, so every surface counts the same thing. Use when: The task adds code under packages/doctrina-cli/src/ that parses a checkbox, a list or bare-bold header, a `## ` section, or an HTML comment out of an artifact (proposal, tasks, spec, delivery, ADR)."
---
<!-- doctrina:skill-export — generated from .doctrina/skills/read-the-grammar-through-the-document-model.md by `doctrina index rebuild`; edit that file, not this one. -->

# Skill — read-the-grammar-through-the-document-model

## When to use this skill

- A new command or a new lib function reads boxes (`- [ ]`), a header
  (`- **Status:**`, `**Version:**`), a section (`## Release`) or skips
  an HTML comment in a `.doctrina/` artifact, or in a workspace
  delivery file.
- A test failure names `one-box-count.test.js` ("the box grammar has one
  owner") or another ADR 0021 contract test.

## Procedure

1. Look in `packages/doctrina-cli/src/lib/doc-model.js` first. It owns
   the on-disk grammar (ADR 0021): `parseChecklist(text, { section })`
   and `checklistProgress` for boxes (every bullet marker, `-`, `*`,
   `+`, and placeholders), `readHeader` / `getHeader` / `setHeader` for
   both header styles, `getSection` / `listSections` for sections,
   `maskComments` / `commentRanges` to skip a comment by position.
2. Compose them instead of re-deriving them. The Release boxes of a
   delivery are `parseChecklist(maskComments(text), { section: "Release" })`
   — one line — and that is the reader both `delivery tick` and
   `delivery check` use (change 0228).
3. When two surfaces report on the same boxes, make them call the SAME
   function. Two readers drift: in 0.20.0 `delivery check` counted
   `- [ ]` with its own regex while `tick` used the model, so a
   `+ [ ]` claim was tickable and invisible to the check.
4. A write keeps the file's line ending: edit in LF if you must, then
   `withEol(text, eolOf(original))` from `lib/fs-ops.js`.
5. If the model genuinely lacks the shape you need, add it to
   `doc-model.js` with its test — never a private copy in the caller.
6. Run `node --test test/one-box-count.test.js` before the full suite:
   it greps `src/` for a box-state capture outside the model.

## Anti-patterns

- `const m = line.match(/^\s*[-*]\s*\[([ xX])\]\s*(.*)$/)` in a command
  module. It looks harmless and is the sixth copy of a grammar that had
  six owners and three different answers for the same file (ADR 0021).
- Splitting on `\n` after reading an artifact: a Windows checkout is
  CRLF, and the last field of every line carries a `\r`.
- Skipping comments by deleting them before parsing: offsets move, and
  an op value that legitimately contains `<!-- -->` is corrupted.

## Related material

- ADR 0021 — one document model owns the `.doctrina` on-disk grammar.
- `packages/doctrina-cli/src/lib/doc-model.js` — the owner.
- `packages/doctrina-cli/test/one-box-count.test.js` — the guard.
- The `check-the-line-ending-before-patching` skill — the same discipline for
  edits made by hand or by script.
