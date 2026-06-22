# ADR 0007 — Structured spec deltas — mechanically applicable ops

- **Status:** accepted
- **Date:** 2026-06-22
- **Deciders:**
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** —
- **Landed:** 2026-06-22 — `packages/doctrina-cli/src/lib/spec-ops.js`, `packages/doctrina-cli/src/commands/change.js`

## Context

A framework review (item **F3**) faulted the change flow at its most
error-prone step: applying a **MODIFIED** spec delta. `change apply` could
write an ADDED spec and delete a REMOVED one mechanically, but for MODIFIED it
only printed a *manual-merge pointer* — the maintainer had to hand-edit the
target `spec.md` to flip an acceptance criterion to `verified`, bump the
`Version:` header, or update `Implementation:`. That hand-merge was the single
biggest source of drift the review found:

- **Index drift (G5 / G7 / G8).** Hand-edited `Version:` / `Implementation:`
  text in a spec was not mirrored into `.doctrina/index.json`, so
  `index rebuild --check` (run in the pre-commit hook) went red until a second
  manual lockstep edit. The maintainer had to remember to bump two places.
- **Transcription error.** "flip criterion 2 to verified, bump to 0.3.0" is
  prose a human parses and re-types by hand — easy to get a number wrong, to
  edit the wrong criterion, or to forget the version bump entirely.

The forces bounding any fix:

- **Semantic rewriting must stay the agent's job (ADR 0005).** The CLI does no
  natural-language interpretation. Whatever is automated must be *mechanical*:
  it can move a marker or a header value, but it must not paraphrase a
  criterion or invent spec prose.
- **Prose deltas must keep working.** Existing changes carry free-form MODIFIED
  bodies merged by hand. A new mechanism cannot break them; it has to be
  additive and opt-in, like `Realizes:` / `Evidence:` before it.
- **The files are the source of truth.** Once apply mutates spec content, the
  index must be regenerated from the tree rather than patched entry-by-entry —
  the per-entry patch path is exactly what let version/implementation text
  drift (G5/G7/G8).

## Decision

Introduce a small, declarative **operation set** that a MODIFIED delta may carry
in a fenced ```` ```ops ```` block, which `change apply` executes against the
target spec in one transaction (the tree-mutation, then an index rebuild). The
verbs are deliberately narrow — they touch **headers** and **acceptance-criteria
markers**, never arbitrary spec prose:

```ops
set-header Implementation: verified — durable adapter (`src/db.ts`)
bump-version minor
set-criterion 1: verified
replace-criterion 2: [verified] new text — verified by `test/x.test.ts`
append-criterion [unverified] new signal — verified by `test/y.test.ts`
```

**Mechanism (additive / opt-in — a MODIFIED delta with no `ops` block falls
back to the historical manual-merge pointer unchanged):**

1. **Parsing is pure and tolerant.** `extractOps` pulls the first ```` ```ops ````
   block (info string exactly `ops`, so a normal code fence in prose is never
   mistaken for operations); `# comment`, `<!-- … -->`, and blank lines are
   ignored; CRLF tolerated. An unparseable verb becomes a recorded error, not a
   throw.
2. **Application is pure and all-or-nothing.** `applyOps` returns
   `{ text, applied, errors }` and never throws. A failed op (header absent,
   criterion number missing, version not semver) is collected in `errors` and
   leaves the text otherwise intact, so `change apply` can **refuse to write a
   partially-mutated spec** — it writes only when `errors` is empty.
3. **A set-header / set-criterion that matches nothing is an error, not a
   no-op.** Silently doing nothing is exactly the drift this prevents.
4. **The index is rebuilt from the tree after any spec write.** `change apply`
   regenerates `index.json` via `deriveIndex` rather than patching the changed
   entry, so a `bump-version` op and the index stay in lockstep with no second
   edit (closes G5/G7/G8). This keeps `index rebuild --check` green immediately
   after apply.

**Scope limit (the honest ceiling).** The ops set automates **bookkeeping**, not
authorship. It can flip a criterion's `[mark]`, swap a criterion's *prose for
the text the delta supplies*, append a criterion, set a header value, and bump a
semver — all mechanical edits the delta states verbatim. It does **not** decide
*whether* a criterion should flip, *what* the new criterion should say, or
*which* version bump is right; that judgement stays with the agent authoring the
delta (ADR 0005). The CLI only transcribes the agent's stated intent without a
human re-typing it.

## Alternatives considered

1. **Keep MODIFIED fully manual (status quo).** Rejected: it is the documented
   source of the G5/G7/G8 index drift and of transcription error; the whole
   point of F3 is to remove the hand-merge.
2. **A free-form patch/diff format (unified diff against the spec).** Rejected:
   a diff is brittle against the surrounding prose (context lines shift), and it
   would let a delta rewrite *arbitrary* spec text — crossing the line into
   semantic authorship the CLI must not own (ADR 0005). The narrow verb set is
   bounded by construction.
3. **A YAML/JSON ops payload in frontmatter.** Rejected: it adds a parser
   dependency or a hand-rolled one for marginal gain, and reads worse inside a
   Markdown delta than a fenced block of one-verb-per-line. The line-based
   format needs no dependencies (the empty-runtime-deps constraint holds).
4. **Patch the index entry in place on apply (keep per-entry update).**
   Rejected: it is precisely the path that let `Version:`/`Implementation:`
   text drift from the index. Rebuilding from the now-updated tree is the
   single-source-of-truth fix and is already how `archive`/`abandon` behave.

## Consequences

**Positive**

- Removes the hand-merge from the most error-prone step of the change flow: a
  MODIFIED delta with an `ops` block applies deterministically, and the index
  is regenerated in the same pass, so `index rebuild --check` stays green with
  no lockstep edit (closes F3 and the G5/G7/G8 drift).
- All-or-nothing application means a malformed op set never leaves a
  half-edited spec; the errors are reported and the file is untouched.
- Pure, dependency-free, and unit-testable (`spec-ops.test.js`) — the verbs are
  small enough to enumerate and the empty-runtime-deps constraint holds.

**Negative**

- New optional delta syntax is more surface to learn and document — in tension
  with right-sizing (review 3.7). Mitigated by making it opt-in: a delta with
  no `ops` block behaves exactly as before.
- The verb set is intentionally incomplete (headers + criteria only). Edits it
  cannot express (e.g. rewriting a Purpose paragraph) still fall to the manual
  pointer, so some MODIFIED deltas remain hand-merged.

**Neutral**

- The `ops` block lives inside the existing MODIFIED delta body; no new file or
  command is introduced. `change diff` still shows the delta body as a fragment.
- Mechanical application narrows but does not eliminate the "shall not
  auto-merge MODIFIED prose" guarantee: arbitrary prose is still never merged
  automatically; only the declared, bounded ops are.

<!--
Once this ADR is accepted, do not edit it. To change the decision,
create a new ADR that supersedes this one and update the "Superseded by"
header above to point at the new ADR. Status transitions:
proposed -> accepted | rejected
accepted -> deprecated | superseded by NNNN
-->
