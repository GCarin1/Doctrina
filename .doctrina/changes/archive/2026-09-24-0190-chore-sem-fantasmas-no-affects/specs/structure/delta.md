# Spec Delta — capability: structure

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/structure/spec.md`

---

O "nenhuma" de uma chore não é uma capability fantasma.

```ops
append-requirement unwanted: The system shall not read an open change's `Affects specs:` header of "none" or "n/a" — including the `(none — chore)` a chore is scaffolded with — or a parenthesised aside beside real names, as capability names, so the ghost-capability warning fires only on a name the author meant.
append-criterion [verified] A chore opened by `work --chore` validates without a ghost warning for "none" or "chore", and an aside such as "(via ops only)" beside a real name is ignored while a real ghost in the same header still warns — verified by `packages/doctrina-cli/test/a-ghost-reference-is-named.test.js`.
bump-version patch
```
