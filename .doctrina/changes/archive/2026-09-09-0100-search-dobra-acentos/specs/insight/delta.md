# Spec Delta — capability: insight

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/insight/spec.md`

---

`search` folds accents, through the same lexicon `work` and `context --for`
already use. It compared raw substrings, so an accent decided the answer:
a query typed without one found nothing in a spec that carries it — and
typing without the accent is the common case, not the rare one.

One retrieval surface deciding equality on its own terms is the finding; the
accent is how it surfaced. ADR 0040 put the lexicon in one place precisely so
that "what counts as the same word" has one answer.

```ops
append-requirement ubiquitous: The system shall compare search terms against artifact text with combining marks folded away, so that a query typed without accents finds the accented text and the reverse.
append-criterion [verified] A query with and without accents finds the same accented text, and folding does not make an absent term match — verified by `packages/doctrina-cli/test/retrieval-folds-and-refuses.test.js`.
bump-version minor
```
