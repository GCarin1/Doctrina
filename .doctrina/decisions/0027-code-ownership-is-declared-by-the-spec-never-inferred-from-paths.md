# ADR 0027 — code ownership is declared by the spec never inferred from paths

- **Status:** accepted
- **Date:** 2026-09-08
- **Scope:** gates, authoring, insight, validation
- **Deciders:**
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** `packages/doctrina-cli/src/lib/scan.js`, `packages/doctrina-cli/src/lib/work-model.js`, `packages/doctrina-cli/src/commands/review.js`, `packages/doctrina-cli/test/code-has-an-owner.test.js`
- **Landed:** —

<!--
Evidence anchors the decision to reality. Once accepted, cite the file(s)
that prove this decision is actually implemented, in backticks, e.g.
"- **Evidence:** `proto/order.proto`, `services/gateway/grpc.ts`".
`doctrina validate` warns when cited evidence is missing on disk (the
decision drifted from the code) or when an accepted ADR cites none. For a
process decision with no code artifact, write "n/a — <why>".

Landed is the non-mutating "this decision is now implemented and verified
here" stamp. Many ADRs are accepted at design time with "Evidence: n/a — no
implementation yet"; once the capability ships, run
"doctrina decision land NNNN `path/to/proof.ts` ..." to record the date and
proof without editing the immutable body. A filled Landed satisfies the
accepted-ADR evidence check.
-->

## Context

`doctrina review` runs inside every `close`. Its central question is «code
under capability X changed — did its spec keep up?», and to ask it the command
has to know which capability a changed file belongs to.

It inferred that. `rankCapabilitiesByDiff` scored a file against a spec on
three signals: the capability name appearing as a path segment, the spec citing
the file path, the spec citing the basename.

Measured over this repository at the time of this decision: **80 of 92 source
files scored zero.** `commands/adapter.js`, `commands/work.js`, `commands/close.js`,
`lib/gates.js`, `lib/runtime.js` — none of them belonged to any capability.
The gate was blind for 87% of the code it was reviewing.

The inference did not fail loudly, it failed flatteringly. Specs cite their
TESTS in acceptance criteria, so the basename signal fires on test files and
almost never on source. And directories named after a concept — `docs/` —
matched by accident, which was worse than not matching: the «this code belongs
to no capability» note only fired when the WHOLE diff missed, so a single
incidental hit silenced it for everything else. The review of an adapter change
printed «Capabilities touched: docs».

The tree already had the answer for the analogous problem. ADR 0023 settled
that the runtime surface is DECLARED and never inferred, for the same reason:
an inference that is right most of the time produces a gate nobody can trust
and nobody can fix.

## Decision

A capability spec declares the code it owns, in an optional `**Source:**`
header holding comma-separated glob patterns:

```
**Source:** `packages/doctrina-cli/src/commands/{init,adapter}.js`, `docs/**`
```

The patterns use the same minimal glob the contract's Selectors use — `*`
inside a segment, `**` across directories, `{a,b}` alternating — so the tree
has one glob dialect, not two.

A declared match outranks every inference. The three heuristics stay as a
fallback for a project that has declared nothing, so this is additive: a spec
with no `**Source:**` behaves exactly as before.

Two gates keep the declaration honest:

- `validate` warns when a `**Source:**` pattern matches no file — a claim over
  code that is not there reads as coverage and provides none (the same rule
  RT05 applies to a selector matching zero targets).
- `review` reports the changed files that belong to no capability, PER FILE,
  so a gap announces itself the first time someone touches that code instead
  of hiding behind an unrelated match.

Doctrina still infers nothing about meaning: what the header says a capability
owns is what it owns.

## Alternatives considered

1. **Improve the heuristic** — score directory names, module import graphs,
   or naming conventions. Rejected: a better guess is still a guess, and the
   failure mode that mattered here was silent confidence, not low accuracy. A
   heuristic cannot be corrected by the person who knows the answer.
2. **Derive ownership from the import graph** — a capability owns what its
   command modules reach. Rejected: it maps shared infrastructure (`fs-ops`,
   `colors`) to every capability at once, and it would make Doctrina parse
   JavaScript, which no other part of the framework does and which would not
   transfer to an adopting project in another language.
3. **A separate ownership file** (`.doctrina/ownership.json`). Rejected: the
   spec is where a capability is defined, and a second file is a second thing
   to keep in sync — the exact failure this decision exists to stop.

## Consequences

**Positive**

- `review` can answer its own question. Coverage of this repository's
  file→capability map went from 12 of 92 source files to every tracked file,
  and the number is now a test rather than an impression.
- A gap is reportable and fixable by the person who knows the answer: add a
  glob to the spec that owns the code.
- `context --for` and `work`'s capability hint read the same map, so all three
  agree about which capability a file belongs to.

**Negative**

- A spec now carries a list that has to be maintained. A file moved without
  updating the header falls out of the map; `validate`'s dead-pattern warning
  catches the pattern that no longer matches, but not a NEW file nobody
  claimed — that is what `review`'s per-file note is for.
- Ownership must be decided, and some files are genuinely shared. Declaring
  one owner for `lib/fs-ops.js` is a judgement, not a fact.

**Neutral**

- Additive: a spec with no `**Source:**` header keeps the previous behaviour
  exactly, so an adopting project inherits the improvement only when it
  declares something.
- Overlap is allowed. Two capabilities may claim the same file, and the
  ranker returns both — the map is a relation, not a partition.

<!--
Once this ADR is accepted, do not edit it. To change the decision,
create a new ADR that supersedes this one and update the "Superseded by"
header above to point at the new ADR. Status transitions:
proposed -> accepted | rejected
accepted -> deprecated | superseded by NNNN
-->
