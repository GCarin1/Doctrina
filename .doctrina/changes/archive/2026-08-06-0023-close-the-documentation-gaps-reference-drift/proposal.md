# Change 0023-close-the-documentation-gaps-reference-drift — Close the documentation gaps: reference drift both ways, an upgrade guide, examples in CI, and honest README claims

- **Status:** applied
- **Applied:** 2026-08-06
- **Date:** 2026-08-06
- **Owner:** audit remediation v2
- **Affects specs:** docs docs

## Why

Close the documentation gaps: reference drift both ways, an upgrade guide, examples in CI, and honest README claims

## What

**D3 — reference drift, both directions.** The suite already checked that
every catalog operation has a reference section. It could not check the
reverse: a section surviving a command's removal or rename. That direction
is worse, because a reader following it gets "unknown command" from a page
that looks authoritative. Check 11 closes it.

*Deviation from the brief:* D3 asked for the reference to be GENERATED from
the catalog. Rejected. It is 1,400 lines per language of hand-written
rationale, worked examples and flag tables that no generator produces, and
generated English summaries in the PT copy would break the parity rule the
same gate enforces. The drift check buys the same guarantee — the catalog
and the reference cannot disagree — without discarding the prose.

**D4 — `upgrading.md`, EN + PT.** Including the answer to the question that
prompted it: one `upgrade --write` does cover every installed agent, because
every adapter is a pointer at the one `AGENTS.md` and none carries a second
copy of anything.

**D5 — examples validate in CI.** Both shipped examples were failing: two
index errors each from indexes written by 0.10.0, and — in the retrofit
example — an EARS state-driven requirement written as a statement of fact
instead of a `shall`, which is exactly the mistake the example exists to
teach against. Fixed, and gated.

**D6 — README claims.** Corrected in both languages: 35 commands → 36 (and
59 operations), seven capability specs → eight, ADRs 0001–0015 → 0001–0022,
and the flowchart's `analyze → change apply` node split in two now that
apply refuses what analyze refuses (ADR 0017). Design principles #1 and #2
now say what enforces them instead of stating an intention.

Check 12 makes the count claim self-policing — and caught `README.pt.md`
the moment it ran. Check 13 does the same for the version stamps.

## Scope boundaries

- The count check matches the CLAIM form ("with 36 commands" / "com 36
  comandos") only. Prose that merely contains a number near the word is not
  a claim, and treating it as one would make the gate unusable.
- Example projects are validated, not executed. Running the FastAPI and
  Express apps in CI would test those frameworks, not Doctrina.

## Verification

<!--
How you will know the change is correctly applied. Use checkboxes: every
box here is a claim that must be PROVEN before the change is done.
`doctrina change archive` refuses to archive while any box below is
unchecked (pass --force to archive anyway and record the gap). Distinguish
"task marked done" from "verification passed" — link the evidence.
-->

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

None.
