# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

<!-- delta body below -->

O carimbo da framework só anda para a frente.

```ops
append-requirement unwanted: The system shall not write a `framework_version` stamp lower than the one the index already carries; an older CLI that rebuilds the index keeps the newer stamp, `validate` reports a stamp ahead of the running CLI as a reason to upgrade the CLI rather than to rebuild, and `index rebuild --check` does not count a stamp ahead as index drift.
append-criterion [verified] A stamp ahead of the running CLI survives `validate --fix` and `index rebuild`, is named by validate as "upgrade the CLI", and `index rebuild --check` exits 0 over it, while a stamp behind is still migrated — verified by `packages/doctrina-cli/test/the-stamp-does-not-regress.test.js`.
bump-version minor
```
