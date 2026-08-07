# Spec Delta — capability: docs

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/docs/spec.md`

---

`doctrina trace --strict` fails on `main`: intent anchor SC5 — "Example
reference projects demonstrate a greenfield and brownfield adoption path" —
is realized by no spec. The examples have shipped for several releases and,
as of D5, the documentation gate validates them; nothing ever connected them
back to the product intent that asked for them.

`docs` is the owner: its requirements already cover `examples/`.

```ops
bump-version patch
set-header Last updated: 2026-08-06
set-header Realizes: SC3, SC5
```
