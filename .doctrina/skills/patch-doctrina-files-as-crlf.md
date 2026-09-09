---
name: patch-doctrina-files-as-crlf
description: Edit files under .doctrina/ knowing they are CRLF, so a regex or script patch cannot silently match nothing and report success.
when: The task edits, patches, or generates any file under .doctrina/ with a script, sed, or a regex replacement rather than by hand.
---

# Skill — patch-doctrina-files-as-crlf

## When to use this skill

- Writing a script that fills in proposals, tasks, deltas, or specs.
- Using `sed`, a Node one-liner, or any regex replacement against a file
  under `.doctrina/`.
- Generating artifact content in bulk (a backlog, a migration, a
  bilingual docs pass).

## The failure this prevents

Files under `.doctrina/` are written with **CRLF** line terminators —
the shipped templates are CRLF, and so is everything scaffolded from
them. Check any time you are unsure:

```sh
file .doctrina/templates/change/proposal.md.template
#   ... with CRLF line terminators
```

A pattern anchored on `\n\n`, `^## What$`, or `$` therefore matches
**nothing**, and a replacement that matches nothing is not an error —
`sed` exits 0, `String.replace` returns the original string, and the
script reports success. The file is unchanged and every downstream gate
sees a file that is structurally valid, because the scaffold it still
holds *is* valid.

This is not hypothetical: it is how six proposals reached the archive
with `## Why` holding nothing but its scaffold comment, past every gate,
in one session.

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

   Splitting on `/\r?\n/` and rejoining with `"\r\n"` is the simplest
   correct shape, and is what `packages/doctrina-cli/src/commands/work.js`
   does when it injects the prompt under `## Why`.

3. **Assert the replacement happened.** The whole defect is a silent
   no-op, so make it loud:

   ```js
   const next = text.replace(pattern, replacement);
   if (next === text) throw new Error(`${file}: pattern matched nothing`);
   ```

4. **Write CRLF back out.** Mixing terminators inside one file is
   tolerated by the parsers but makes the next diff unreadable. Join
   with `"\r\n"`.

5. **Verify by reading the content, not the exit code.** After a bulk
   edit, look at one file, and run the gate that inspects bodies:

   ```sh
   cat -A .doctrina/changes/<id>/proposal.md | head -20
   doctrina analyze <id>     # fails on a section that is still scaffold
   ```

## Anti-patterns

- Trusting a zero exit code from `sed -i` as proof the edit landed.
- Writing LF into a file that other tooling will later patch with a
  CRLF-aware pattern — the pattern then fails in the other direction.
- Assuming the platform decides this. The terminators come from the
  templates and the repository has no `.gitattributes`, so a checkout
  on Linux carries CRLF too.
- "It worked when I tested it by hand" — a hand edit in an editor
  normalises terminators; the script does not.

## Related material

- `packages/doctrina-cli/src/commands/work.js` — the CRLF-tolerant
  injection under `## Why`.
- `packages/doctrina-cli/src/commands/analyze.js` — the hollow-section
  check that exists because this defect shipped.
- [[stage-a-change-backlog]] — the bulk-authoring case where this bites
  hardest.
