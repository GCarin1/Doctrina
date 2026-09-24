# Spec Delta — capability: insight

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/insight/spec.md`

---

A lane com que a change nasceu sobrevive ao arquivamento.

```ops
append-requirement ubiquitous: The system shall carry the lane recorded in a change's proposal into its archived index entry, built by one constructor that both `change archive` and `index rebuild` use, so the report's lane mix counts the history by the lane each change was born in and reports as unknown only a change that recorded none.
append-criterion [verified] An archived chore keeps its lane in the index whether written by `change archive` or derived by `index rebuild` (the two entries are equal), and the report's Lanes section counts it instead of reporting it unknown — verified by `packages/doctrina-cli/test/a-lane-sobrevive-ao-arquivamento.test.js`.
bump-version minor
```
