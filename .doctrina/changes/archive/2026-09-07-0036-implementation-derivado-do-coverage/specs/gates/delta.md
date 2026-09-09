# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

<!-- delta body below -->

The `Implementation:` header was maintained from memory while `coverage`
already computed the number it depends on. This delta declares the derivation,
the three surfaces that read it, and the boundary that keeps it honest: the
gates propose the value and never write it.

```ops
append-requirement ubiquitous: The system shall derive a capability's implementation state from its acceptance-criteria coverage — every criterion proven yields verified, some proven yields partial, none yields planned — and every surface that reports or applies that state shall read the same derivation.
append-requirement event: When a spec's written implementation state disagrees with the state its coverage supports, the system shall warn and name the operation that settles it, unless the written state carries an explanatory note or understates by exactly the uncertified rung.
append-requirement event: When `doctrina close <id>` reaches the implementation step, the system shall report the derived state for each capability the change touched and print the header operation that would apply it.
append-requirement event: When `doctrina spec set <cap> --implementation auto` runs, the system shall write the derived state, and shall refuse without writing when the spec declares no acceptance criteria to derive from.
append-requirement unwanted: The system shall not rewrite an implementation header from a gate; a derived state shall be proposed and applied only by an explicit command.
append-criterion [verified] The three bands of the derivation, the uncertified-rung exemption, and the explanatory-note escape hatch each behave as declared — verified by `packages/doctrina-cli/test/implementation-derived.test.js`.
append-criterion [verified] A fully proven spec still marked planned is warned about by `validate`, and a half-proven spec claiming verified is warned about in the other direction — verified by `packages/doctrina-cli/test/implementation-derived.test.js`.
append-criterion [verified] `spec set --implementation auto` writes the derived state, refuses a spec with nothing to derive from, and leaves that spec untouched — verified by `packages/doctrina-cli/test/implementation-derived.test.js`.
append-criterion [verified] The close proposes the header op and the spec it reports on is byte-identical afterwards — verified by `packages/doctrina-cli/test/implementation-derived.test.js`.
bump-version minor
```
