# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

Uma intenção, uma âncora.

```ops
append-requirement event: When `doctrina intent add` is given a text that an existing anchor already states — compared with case, accents, spacing and trailing punctuation folded away, pinned id or not — the system shall refuse without writing, naming the anchor that states it, because the twin would stay dropped once a spec realizes the first and `trace --strict` would fail on a gap no spec can close.
append-criterion [verified] The same intent added twice, in any casing, accenting, spacing or with a pinned id, is refused naming the existing anchor and writes nothing, while a different intent is still added — verified by `packages/doctrina-cli/test/uma-intencao-nao-vira-duas-ancoras.test.js`.
bump-version minor
```
