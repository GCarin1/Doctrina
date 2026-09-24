# Spec Delta — capability: structure

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/structure/spec.md`

---

Um cabeçalho que comanda o fluxo é lido de volta como todo outro.

```ops
append-requirement event: When `doctrina validate` runs on a tree holding an intake, the system shall report an error for a Status that is neither pending nor converted, reading the value as every other status is read — case-folded, with a note after the value tolerated — because any other word silently means pending.
append-criterion [verified] Only the two declared words pass validate on an intake, and an empty or mistyped value is reported rather than read as pending — verified by `packages/doctrina-cli/test/o-status-do-intake-tem-dono.test.js`.
bump-version minor
```
