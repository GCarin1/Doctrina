# Spec Delta — capability: insight

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/insight/spec.md`

---

<!-- delta body below -->

## What changes

`show` numbers requirements over authored bullets only, and its `--help`
states how its positional numbering relates to the per-section numbering a
spec delta's `replace-requirement` uses.

```ops
bump-version minor
append-requirement event: When resolving an `<cap>-RN` reference, the system shall number requirements over authored bullets only, skipping any bullet that lies inside an HTML comment.
append-criterion [verified] On a spec `doctrina spec new` has just created, `show <cap>-R1` returns the first authored requirement rather than the scaffold's EARS legend, and a spec with no authored requirement reports zero — verified by `packages/doctrina-cli/test/comment-is-not-content.test.js`.
```
