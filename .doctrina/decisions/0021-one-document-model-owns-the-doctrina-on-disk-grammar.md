# ADR 0021 — One document model owns the .doctrina on-disk grammar

- **Status:** accepted
- **Date:** 2026-08-06
- **Deciders:** GCarini + agent session of 2026-08-06 (audit remediation v2)
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** `packages/doctrina-cli/src/lib/doc-model.js`, `packages/doctrina-cli/src/commands/validate.js`
- **Landed:** 2026-08-06 — covered by `packages/doctrina-cli/test/doc-model.test.js`

## Context

The `.doctrina/` format is Doctrina's public API. Its specification had ten
homes.

The ADR `Status:` grammar existed as ten regex literals across three files,
and they were **not equivalent**: seven captured a value, one only tested
for presence, and two were anchored to end-of-line so a file saved with a
trailing space defeated them silently. Section extraction was reimplemented
six times under six names — `extractSection` twice, `sectionOf`,
`sectionParagraph`, `productSection`, and the sections map in `spec-ops` —
which disagreed about whether a deeper heading ends a section.

This violates the framework's own design principle #1: "Single ownership of
every fact. No information has two homes."

The practical cost: `validate` could report a malformed header but never
repair one, because no single component knew what "well-formed" meant.

## Decision

`src/lib/doc-model.js` owns the grammar. Every header read, every section
extraction, and every header write goes through it.

**Lenient on read.** `**Status:** x`, `**Status**: x`, with or without the
list dash, with or without trailing whitespace, on LF or CRLF — all parse.
A recognised-but-non-canonical form is *reported* rather than silently
accepted or silently missed.

**Strict on write.** One canonical form, `**Name:** value`, with the list
dash decided by the ARTIFACT KIND rather than by the author remembering:
specs, contracts and product use bare bold; ADRs, proposals and the intake
use list items. Mixing them was a documented, recurring mistake.

**Scoped to the preamble.** A metadata header lives before the first `##`
section and carries a colon. Both constraints are load-bearing: without the
colon requirement, the `**Positive**` / `**Negative**` / `**Neutral**`
blocks in every ADR parse as headers; without the preamble scope, a prose
lead-in like `**Standing constraints lived in agent memory:**` does.

**The payoff: `validate --fix` repairs headers.** Previously it only
rebuilt `index.json`, so a malformed header was reported forever with no
mechanical remedy.

## Alternatives considered

1. **Leave the copies and add a lint that they agree.** Rejected: a test
   that ten regexes are equivalent is harder to write, and harder to trust,
   than one regex.
2. **A full Markdown AST (remark/mdast).** Rejected on the zero-runtime-
   dependency constraint, and because the grammar in question is a dozen
   line shapes, not a document tree.
3. **Normalise every artifact to LF on repair.** Rejected: repairing one
   header must not produce a whole-file diff on a CRLF checkout. The repair
   preserves each line's existing ending.

## Consequences

**Positive**

- One definition of the format the framework calls its public API.
- `validate --fix` can repair header drift instead of only reporting it.
- The six section helpers are gone; their disagreements went with them.

**Negative**

- `spec-ops.js` keeps a private header pattern: its verbs REWRITE headers
  in place and need the prefix captured to preserve it. That is a second
  reader of the grammar, narrower and deliberate, and it is annotated as
  such rather than pretended away.
- The preamble scope means a metadata header placed after the first section
  is invisible to conformance checking. No artifact does that, and the
  templates make it unlikely, but it is a real limit.

**Neutral**

- `specHeader` / `listHeader` survive as thin aliases: dozens of call sites
  use them, and the distinction they encoded is now the model's job.
