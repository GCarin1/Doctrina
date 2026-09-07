# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

<!-- delta body below -->

A MANUAL MERGE, deliberately: this delta removes content, and the ops
grammar has no `remove-requirement` verb — by design, because removing a
requirement is a decision a human should see in a diff rather than a verb
buried in a block. The `split-an-oversized-spec` skill prescribes the same:
move the requirement blocks VERBATIM, do not rewrite EARS prose while
moving, one change one intent.

What moved out of this spec, into the new `insight` spec (its ADDED delta
carries the full body):

- **Ubiquitous** — the context-pack token budget, ADR scoping into packs,
  the single read-only collection, and the command-module import direction.
- **Event-driven** — `status`, `why` (both directions), `constitution`,
  `context` (plus `--budget` and `--diff`), `search`, `show`, `prime`,
  `handoff`, `report`, the irreducible-core refusal, `--for` ranking, the
  in-focus change rules, and rendering a view by name.
- **State-driven** — both: pack degradation order, and how a parked change
  is carried.
- **Unwanted** — never silently omitting an artifact from a pack, and never
  letting the number of open changes decide whether a pack can be assembled.
- **Acceptance criteria** — the eleven proved by
  `test/context-retrieval.test.js` and `test/one-collector.test.js`.

What changed in place: the `## Purpose` now describes one half and points at
the other, `## Out of scope` names the new capability, and the surviving
acceptance criteria are renumbered 1..35 with no gaps.

No requirement was rewritten, reworded, or dropped. The seam is the one this
spec's own Purpose always described: a GATE reads the tree in order to
refuse; a VIEW assembles what is there and refuses nothing.

```ops
bump-version major
```
