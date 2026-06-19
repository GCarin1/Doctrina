# ADR 0006 — Intent provenance — trace specs to product intent

- **Status:** accepted
- **Date:** 2026-06-19
- **Deciders:**
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** n/a — design decision; implementation follows acceptance
- **Landed:** 2026-06-19 — `packages/doctrina-cli/src/commands/trace.js`, `packages/doctrina-cli/src/lib/scan.js`

## Context

A framework review (Doctrina 0.3.0) found the headline remaining gap: the CLI
validates **linkage**, not **fidelity to intent**. `doctrina coverage` certifies
that *each acceptance criterion cites a test that exists* — not that *the
criterion is the right one*, nor that *the test exercises the original intent*
rather than the implementation that already exists. The strongest metric (100%
coverage) is satisfiable by writing a criterion that is slightly weaker than the
intake's promise, implementing exactly that, and citing a test that matches it —
with no gate complaining (review items 3.1 and 3.2).

The forces that bound any fix:

- **The intake is freeform and frozen.** `.doctrina/intake.md` is raw intent
  stored verbatim; ADR 0005 makes it agent-converted and the rules forbid
  editing it after conversion. It has no addressable clauses, so a criterion
  cannot deterministically cite "the intake line it came from."
- **`product.md` is the structured distillation.** Vision / Scope (in/out) /
  Non-goals / **Success criteria** / Delivery order are where intent becomes
  addressable. This is the only place a deterministic provenance link can anchor.
- **Fidelity is two questions, not one.** (a) *Does every stated intent have a
  capability, and does every capability trace to a stated intent?* — a
  completeness question, decidable deterministically. (b) *Does the criterion
  faithfully encode the intent (vs. a quietly weaker promise)?* — a semantic
  question that needs a model in the loop. Conflating them produces a gate that
  claims more than it can deliver.

The framework's existing pattern for this kind of check is `coverage`: a
read-only, opt-in, citation-based report that can gate under `--strict`. The new
mechanism should mirror it, not reinvent it.

## Decision

Introduce **intent provenance** as an opt-in, deterministic link from
`product.md` intent to capability specs, surfaced by a new read-only command
`doctrina trace` (sibling of `coverage`). It checks the **completeness** of the
intent↔capability link; it deliberately does **not** judge semantic fidelity.

**Mechanism (all additive / opt-in — absent markers mean "not yet traced", never
an error by default):**

1. **Product anchors.** A `## Success criteria` (and optionally `In scope`)
   bullet may carry a short stable id tag at its head:
   `- [SC1] Rework rate is lower than the pre-adoption baseline.`
   Convention: `[A-Z]+\d+`. The tag is the addressable unit of intent.

2. **Spec back-reference.** A capability spec may declare a `**Realizes:**`
   header (same opt-in shape as `**Implementation:**` / `**Evidence:**`):
   `**Realizes:** SC1, SC3`. It names the product intent the capability delivers.

3. **Criterion-level anchor (optional).** An acceptance criterion may name the
   intent it serves inline: `1. [verified] <signal> — realizes SC1 — verified by
   \`test/x\`.` This lets a future check tie a *test* to an *intent*, not just to
   a criterion.

4. **`doctrina trace` reports three provenance breaks:**
   - **dropped intent** — a product anchor that no spec `Realizes:` (a promise
     with no capability behind it);
   - **dangling realizes** — a spec cites an id absent from `product.md` (broken
     provenance);
   - **untraceable spec** — an `active` spec with no `Realizes:` header (a
     capability tied to no stated intent).
   Read-only; exits 0 as a report, exits 1 under `--strict` for CI.

**Scope limit (the honest ceiling).** `trace` proves the link *exists and is
complete*. It does **not** prove the criterion is *faithful* to the intent — that
"the spec quietly shrank the promise" is a semantic judgment. That check is
deferred to a **Future** `doctrina trace --semantic` (or an `intent-drift` check)
that uses an LLM to compare each criterion against its anchored intent and the
intake. The deterministic core ships first and stands alone; the semantic layer
is explicitly aspirational and gated behind a model, never claimed by the
deterministic gate.

## Alternatives considered

1. **Match by capability name (no new syntax).** Check that every spec'd
   capability is named in `product.md` and vice versa. Rejected as the *primary*
   mechanism: it is capability-level only, so it cannot link a *criterion* to an
   intent and cannot express "this capability realizes success-criterion SC2." It
   is a weaker subset of what `Realizes:` gives, for marginally less ceremony.
2. **Fold the check into `coverage`.** Rejected: `coverage` answers "does the
   criterion have a test?"; provenance answers "does the capability trace to an
   intent?". They are different questions with different failure modes; merging
   them muddies both reports. Separate commands mirror the existing
   `validate`/`coverage`/`verify` split.
3. **LLM-only intent-drift check.** Rejected as the *first* slice: it is
   non-deterministic, cannot gate cleanly in CI/pre-commit, and costs tokens per
   run. It is the right tool for the *fidelity* question and is kept as the
   deferred `--semantic` layer — but the completeness link should be deterministic
   and free.
4. **Cite intake clauses directly.** Rejected: the intake is stored verbatim and
   frozen (ADR 0005); it has no stable, addressable ids and must not be edited to
   add them. `product.md` is the correct, structured anchor, and the intake→
   product fidelity stays a conversion-time human/LLM judgment (already in the
   bootstrap playbook, step 2).

## Consequences

**Positive**

- Makes the intent→capability link **explicit and checkable**, closing the
  completeness half of the review's headline gap (3.1/3.2) at the deterministic
  ceiling, with the same opt-in, citation-based shape the framework already uses.
- Lets `coverage` and `trace` compose into a full chain: *intent → capability →
  criterion → test*. A reader can ask "what realizes SC2?" and get an answer.
- Draws an **honest boundary**: the deterministic gate never claims to verify
  fidelity; the semantic claim is explicitly deferred and model-gated.

**Negative**

- New optional syntax (`[ID]` anchors, `Realizes:` header) is more surface and
  more ceremony — in tension with right-sizing (review 3.7). Mitigated by making
  every marker opt-in (untraced ≠ error by default; `--strict` is the gate).
- `product.md` must grow stable anchor ids, and those ids can drift (an anchor
  renamed/removed while specs still cite it) — though `trace` detects exactly
  that as a dangling reference.

**Neutral**

- `trace` is a read-only sibling of `coverage`; no migration is forced. Existing
  projects gain `untraceable spec` nudges only, and only when they run it.
- The `Realizes:` ids flow into `index.json` (like `Evidence`/`Landed`) so the
  link is queryable, not just prose.

<!--
Once this ADR is accepted, do not edit it. To change the decision,
create a new ADR that supersedes this one and update the "Superseded by"
header above to point at the new ADR. Status transitions:
proposed -> accepted | rejected
accepted -> deprecated | superseded by NNNN
-->
