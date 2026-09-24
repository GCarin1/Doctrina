# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

O `validate` vê a gêmea que o `intent add` agora recusa.

```ops
append-requirement event: When `product.md` declares two intent anchors that state the same intent under different ids, the system shall report a warning naming both lines and the remedy, because realizing one leaves the other dropped and `trace --strict` fails on a gap no spec can close.
append-criterion [verified] A hand-written twin anchor in `product.md` makes `validate` warn, naming the twin and the first anchor's line — verified by `packages/doctrina-cli/test/uma-intencao-nao-vira-duas-ancoras.test.js`.
bump-version minor
```
