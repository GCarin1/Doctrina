# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

<!-- delta body below -->

A marca do autor num critério é lida pela aritmética de implementação:
ligado não é certificado.

```ops
append-requirement ubiquitous: The system shall derive the Implementation state no higher than `implemented` while any covered acceptance criterion is still marked `[unverified]`, and shall say, in `validate` and in `coverage`, which criteria are waiting for their mark to be flipped.
append-requirement unwanted: The system shall not propose or write `verified` for a spec on the strength of a criterion whose author marked it `[unverified]`, whether the proposal comes from `validate` or the write from `spec set --implementation auto`.
append-criterion [verified] With one covered criterion still marked [unverified], validate proposes "implemented" naming the count, `spec set --implementation auto` writes `implemented`, coverage lists the criterion with the op that flips the mark, and flipping it lets the same doors read `verified` — verified by `packages/doctrina-cli/test/the-mark-is-the-authors.test.js`.
bump-version minor
```
