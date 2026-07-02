---
name: keep-docs-en-pt-parity
description: Keep docs/en and docs/pt as true mirrors — same files, same structure, EN as the source of truth.
when: The task adds, renames, removes, or substantially edits any file under docs/.
---

# Skill — keep-docs-en-pt-parity

## When to use this skill

- Adding a new documentation topic.
- Editing an EN doc (the PT mirror must move in the same change).
- Renaming or deleting a doc file.

## Procedure

1. EN is the source of truth; PT is a translation of EN, never the
   reverse. Author the EN change first, then mirror it into the PT
   file with the identical filename under `docs/pt/`.
2. Never translate file paths, command names, code identifiers,
   fenced examples, or artifact status vocabulary (`active`,
   `verified`, `Read-only`). Headings that name commands stay in
   backticks exactly as in EN (`## doctrina spec set <capability>`
   stays untranslated) — the docs drift test parses them.
3. Every PT file carries, right under its H1, the source note:
   > Tradução da [versão em inglês](../en/<file>.md). O inglês é a
   > fonte de verdade; este arquivo o segue.
4. A new topic lands as a PAIR (EN + PT) in the same change, plus a
   sidebar entry in `docs/en/_sidebar.md` and `docs/pt/_sidebar.md`.
5. Prose docs stay under the 250-line soft cap
   (`.doctrina/specs/docs/spec.md`); lookup references
   (`cli-reference.md`) are exempt — agents read them per-section.
6. Check yourself with the gates: `doctrina validate` warns on a
   missing EN↔PT counterpart, and `node scripts/check-docs.js`
   (also wired into `doctrina verify`) checks parity, H1 shape,
   line caps, and the PT source note.

## Anti-patterns

- "I'll translate it later": the file lands in EN only, the PT tree
  silently falls behind, and no reader of the PT docs ever learns
  the feature exists.
- Translating a command heading (`## doctrina search <termo>` is
  fine in the body text, but the command word itself must remain
  `search`) — it breaks lookup and the heading-based drift test.
- Writing new content directly in PT. If the content is worth
  having, it is worth having in the source language first.

## Related material

- `.doctrina/specs/docs/spec.md` — the docs capability contract.
- `scripts/check-docs.js` — the executable shape check.
- `AGENTS.md` — "Do NOT translate file paths, command names, or code
  identifiers."
