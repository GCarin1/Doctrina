# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

Change 0110 introduced the shared name grammar and put it in a new module,
`packages/doctrina-cli/src/lib/names.js`. No spec names that module, so the
file has no owning capability and `code-has-an-owner` refuses the tree.

The criterion for the rule cites `test/a-name-is-portable.test.js`, which is
correct and stays: a test that fails when the claim stops being true is
better evidence than the implementation. Ownership is a different question —
"which capability is this file part of?" — and it is answered where the
requirement describes the rule, exactly as the `cli` spec names
`lib/commands.js` as the canonical operation catalog.

```ops
replace-requirement ubiquitous 11: The system shall validate the name of a new spec, contract or skill against one shared grammar, defined once in `packages/doctrina-cli/src/lib/names.js` — lowercase letters, digits and hyphens, starting with a letter, no trailing or doubled hyphen, at most 64 characters, never a Windows reserved device name (con, prn, aux, nul, com1-com9, lpt1-lpt9) — and shall name the rule that failed.
bump-version patch
```
