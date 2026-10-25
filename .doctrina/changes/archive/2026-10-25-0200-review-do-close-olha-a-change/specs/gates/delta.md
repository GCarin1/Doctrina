# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

```ops
replace-requirement ubiquitous 11: The system shall determine which capability owns a source file from the `**Source:**` globs the capability specs declare; for a file no glob claims, from the specs citing its exact path; and only for a file neither claims, from path and basename inference over the specs that declare no Source — never adding an inferred owner to a declared or cited one (ADR 0027).
append-requirement event: When `review` runs for a change — `--change <id>`, as `close` runs it — the system shall count the capabilities that change's deltas target as updated, and shall report code under capabilities the change carries no delta for in one finding naming them all.
append-criterion [verified] A file claimed by one spec's `**Source:**` is owned by that spec alone even when other specs mention its basename, and `review --change <id>` names neither the change's own capability nor more than one line for the other changed capabilities, while plain `review` keeps one break per capability and an unknown or path-shaped id exits 2 — verified by `packages/doctrina-cli/test/o-review-do-close-olha-a-change.test.js`.
bump-version minor
```
