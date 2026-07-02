---
name: write-acceptance-evidence
description: Write acceptance criteria whose evidence actually resolves, so coverage --strict stays green and honest.
when: The task writes or edits a spec's Acceptance criteria, or coverage reports bare/dangling criteria.
---

# Skill — write-acceptance-evidence

## When to use this skill

- Authoring or editing `## Acceptance criteria` in any spec.
- `doctrina coverage` reports a criterion as bare, dangling, or
  conditional and you need to fix it honestly.

## Procedure

1. Every criterion cites its proof as a backtick path span on any of
   its lines (continuation lines count — the parser is
   `packages/doctrina-cli/src/lib/criteria.js`):
   `1. [verified] Exits 0 on success — proven by \`test/cli.test.js\`.`
2. Paths resolve relative to the REPO ROOT and must exist. The
   classic dangling mistake: citing `index.html` when the file lives
   at `docs/index.html`. Write the full path from the root.
3. A token only counts as evidence if it has a slash or a file
   extension and no placeholder characters — `<capability>`, globs,
   and bare words are ignored (so they neither prove nor dangle).
4. The best evidence is executable: a test that fails if the claim
   stops being true. Order of preference: a test file > a checker
   script wired into `verify.json` > the implementing source file >
   a doc. Never cite a file merely because it exists.
5. Mark `[verified]` ONLY with a citation: `validate` warns on a
   self-certified criterion (`[verified]` with no proof path,
   ADR 0008). Use `[unverified]` while proof is pending — an honest
   red beats a dishonest green.
6. If a criterion cannot have repo-resident proof (it describes a
   process adopting teams run, not this repo), do not force a fake
   citation — rewrite the criterion to measure the deliverable that
   DOES live in the repo, and keep the process rubric in a separate
   section that coverage does not parse.
7. Close the loop: `doctrina coverage --strict` must exit 0, and
   `doctrina why <capability>` must show ✓ per criterion.

## Anti-patterns

- Citing a folder or file that "should exist" without checking —
  the `validation` spec cited `memory/`, a folder ADR 0003
  deliberately rejected, and dangled for months.
- Citing the spec itself as its own proof (circular).
- Flipping a criterion to `[verified]` in the same commit that
  deletes its failing test.

## Related material

- ADR 0008 — honest gates (coverage skip detection).
- `.doctrina/specs/gates/spec.md` — coverage/trace semantics.
- `packages/doctrina-cli/src/lib/criteria.js` — the shared parser.
