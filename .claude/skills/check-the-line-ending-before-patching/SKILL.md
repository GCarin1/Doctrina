---
name: check-the-line-ending-before-patching
description: "Patch a file under .doctrina/ with a script without assuming its line ending, so a regex cannot silently match nothing and report success. Use when: The task edits, patches, or generates any file under .doctrina/ with a script, sed, or a regex replacement rather than by hand."
---
<!-- doctrina:skill-export — generated from .doctrina/skills/check-the-line-ending-before-patching.md by `doctrina index rebuild`; edit that file, not this one. -->

# Skill — check-the-line-ending-before-patching

## When to use this skill

- Writing a script that fills in proposals, tasks, deltas, or specs.
- Using `sed`, a Node one-liner, or any regex replacement against a file
  under `.doctrina/`.
- Generating artifact content in bulk (a backlog, a migration, a
  bilingual docs pass).

## The failure this prevents

A file under `.doctrina/` may end its lines with LF or with **CRLF**, and
which one is not a property of Doctrina: it is the checkout's. This
repository is LF everywhere — `.gitattributes` says `* text=auto eol=lf` —
but it was not always (a Windows checkout with `core.autocrlf` turned the
templates and everything scaffolded from them into CRLF), and a project
that uses Doctrina has whatever its own git settings give it. Look:

```sh
file .doctrina/changes/<id>/proposal.md
#   "... with CRLF line terminators", or no mention of terminators (LF)
```

A pattern anchored on `\n\n`, `^## What$`, or `$` matches **nothing** in a
CRLF file, and a replacement that matches nothing is not an error —
`sed` exits 0, `String.replace` returns the original string, and the
script reports success. The file is unchanged and every downstream gate
sees a file that is structurally valid, because the scaffold it still
holds *is* valid.

This is not hypothetical: it is how six proposals reached the archive
with `## Why` holding nothing but its scaffold comment, past every gate,
in one session.

## Inside the CLI there is nothing to do

Since change 0250 the CLI's own `read` (`src/lib/fs-ops.js`) returns every
file with LF, and `write` gives an existing file back the ending it had. New
code under `packages/doctrina-cli/src/` writes its patterns for LF and calls
`read`/`write` — never `readFileSync` on an artifact, and no `eolOf`/`withEol`
bookkeeping. The procedure below is for a script OUTSIDE the CLI (a one-off
Python or sed pass), which sees the bytes as they are on disk.

## Procedure

1. **Prefer writing the file whole.** Read it, build the full new
   content in memory, write it back. A whole-file write cannot
   silently half-apply.

2. **When you must pattern-match, use `\r?\n` everywhere.** Never a bare
   `\n`, never a bare `$` in multiline mode.

   ```js
   // wrong — silently no-ops on a CRLF file
   text.replace(/(## Why\n\n)<!--[\s\S]*?-->\n/, `$1${why}\n`);

   // right
   text.replace(/(## Why\r?\n\r?\n)<!--[\s\S]*?-->[ \t]*\r?\n?/, `$1${why}\n`);
   ```

   Inside the CLI, `eolOf(text)` reads the ending a file already has and
   `withEol(text, eol)` writes it back (`packages/doctrina-cli/src/lib/fs-ops.js`);
   `commands/work.js` does that when it injects the prompt under `## Why`.

3. **Assert the replacement happened.** The whole defect is a silent
   no-op, so make it loud:

   ```js
   const next = text.replace(pattern, replacement);
   if (next === text) throw new Error(`${file}: pattern matched nothing`);
   ```

4. **Write back the ending the file had.** Mixing terminators inside one
   file is tolerated by the parsers but makes the next diff unreadable:
   split on `/\r?\n/`, and rejoin with whichever the file used.

5. **Verify by reading the content, not the exit code.** After a bulk
   edit, look at one file, and run the gate that inspects bodies:

   ```sh
   cat -A .doctrina/changes/<id>/proposal.md | head -20
   doctrina change check <id>   # fails on a section that is still scaffold
   ```

## Anti-patterns

- Trusting a zero exit code from `sed -i` as proof the edit landed.
- Writing one ending into a file that holds the other — the next
  pattern then fails in the other direction.
- Assuming either ending. "It is Linux, so it is LF" was false in this
  repository for months, and "`.doctrina/` is CRLF" is false in it now.
- "It worked when I tested it by hand" — a hand edit in an editor
  normalises terminators; the script does not.

## Related material

- `packages/doctrina-cli/src/commands/work.js` — the injection under `## Why`
  that keeps the file's own ending.
- `packages/doctrina-cli/src/commands/analyze.js` — the hollow-section
  check that exists because this defect shipped.
- [[stage-a-change-backlog]] — the bulk-authoring case where this bites
  hardest.
