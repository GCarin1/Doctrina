# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

<!-- delta body below -->

Um nome que aponta para um artefato que não existe é apontado onde quer
que o cabeçalho esteja.

```ops
append-requirement event: When a spec's `Depends on` header names a capability that has no spec, the system shall report an error naming the spec, the missing capability and the remedy, because the pack, the dependency graph and the review all read that header.
append-requirement event: When an open change's `Affects specs` header names a capability that has no spec and no ADDED delta in that change, the system shall report a warning naming the change and the capability.
append-requirement event: When `product.md` declares the same intent anchor id twice, the system shall report an error naming both lines, and `trace` shall name the duplicate rather than silently keep the first.
append-criterion [verified] `Depends on: fantasma` is a validate error, `Affects specs: fantasma` without an ADDED delta is a warning and with one is silent, and a duplicated `[SC1]` is a validate error named by trace — verified by `packages/doctrina-cli/test/a-ghost-reference-is-named.test.js`.
bump-version minor
```
