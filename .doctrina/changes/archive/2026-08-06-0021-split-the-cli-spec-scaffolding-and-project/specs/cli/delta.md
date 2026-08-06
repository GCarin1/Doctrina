# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

The `cli` spec crossed its 400-line cap a second time (486 lines) and began
to squeeze accepted decisions out of its own context pack: `doctrina context
cli` sat at 100% of the 15,000-token budget, so ADRs were being dropped from
the pack a developer working on `cli` receives. ADR 0022 made that visible;
this change is the remedy the `split-an-oversized-spec` skill prescribes.

Two operations, in order:

1. **Deduplicated** 9 requirements and 6 acceptance criteria. `change apply`
   is not idempotent, and re-applying a delta during the 0.14.0 work
   duplicated them. Removing an exact duplicate loses no contract.
2. **Moved** 30 requirements and 4 acceptance criteria verbatim to the new
   `scaffolding` capability, along the seam the spec's own Purpose already
   named. `cli` keeps the command surface, the authoring commands, and the
   conventions every command shares (exit codes, flag declaration, the JSON
   envelope, zero runtime dependencies).

Result: 486 → 431 lines, and `context cli` back off its ceiling.

No `ops` block: moving requirement blocks between two files is not
something the bounded ops verbs can express, and the spec files carry the
result of this change directly.
