# Spec Delta — capability: validation

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/validation/spec.md`

---

Content inside a fenced block is a picture of a criterion, never one. A spec
that documents the criterion format wrote a `[verified]` example citing
`pkg/x.js`, and it inflated the coverage denominator and answered `show
<cap>-C2`.

The finding underneath it is the one worth the requirement. `lib/criteria.js`
opens by claiming to be the single parser every surface reads criteria
through, and `coverage-model.js` carried a second implementation — so the
claim was false and the two were free to disagree. They did, the moment the
fence was handled in one of them: `show` counted one criterion and
`coverage` counted three. Two parsers for one grammar is the defect; the
fence was how it became visible.

```ops
append-requirement unwanted: The system shall not read a numbered item inside a fenced code block as an acceptance criterion, nor its citations as that criterion's proof.
append-requirement ubiquitous: The system shall parse acceptance criteria through exactly one implementation, so that every surface reporting them agrees about what a criterion is.
append-criterion [verified] A fenced example is not counted, and its citation does not become the real criterion's proof — verified by `packages/doctrina-cli/test/an-example-is-not-a-criterion.test.js`.
append-criterion [verified] `coverage` and `show` report the same count for the same spec, because both read through the shared parser — verified by `packages/doctrina-cli/test/an-example-is-not-a-criterion.test.js`.
append-criterion [verified] A heading inside a fence does not open the criteria section, and fence tracking follows the CommonMark closing rule — verified by `packages/doctrina-cli/test/an-example-is-not-a-criterion.test.js`.
bump-version minor
```
