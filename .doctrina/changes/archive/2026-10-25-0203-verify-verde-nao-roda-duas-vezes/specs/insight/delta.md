# Spec Delta — capability: insight

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/insight/spec.md`

---

```ops
append-requirement ubiquitous: The system shall fingerprint the content of a working tree — tracked, untracked and edited files, ignored ones excluded — without modifying the repository's index, HEAD or files.
append-criterion [verified] The working-tree fingerprint changes with an edit or a new file, not with an ignored file or an excluded top-level entry, and leaves the index empty of staged changes — verified by `packages/doctrina-cli/test/o-verify-verde-nao-roda-duas-vezes.test.js`.
bump-version minor
```
