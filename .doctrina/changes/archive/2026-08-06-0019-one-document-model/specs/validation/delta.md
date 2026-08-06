# Spec Delta — capability: validation

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/validation/spec.md`

---

Audit item M3, ADR 0021. The on-disk format is the framework's public API
and its specification had ten homes — ten non-equivalent regex literals for
one header grammar, and six reimplementations of section extraction.

```ops
bump-version minor
set-header Last updated: 2026-08-06
append-requirement ubiquitous: The system shall define the on-disk artifact grammar in one module, and every header read, section extraction, and header write shall go through it.
append-requirement ubiquitous: The system shall read headers leniently, accepting every recognised written form, and write them strictly in one canonical form whose list-or-bare style is decided by the artifact kind.
append-requirement event: When `doctrina validate --fix` runs, the system shall repair headers that are recognised but not canonical, preserving each line's existing ending and never altering content.
append-requirement unwanted: The system shall not treat bold prose as a metadata header; a header carries a colon and lives before the first section.
append-criterion [verified] Every recognised header form parses, bold prose does not, and writing produces one canonical form — verified by `packages/doctrina-cli/test/doc-model.test.js`.
append-criterion [verified] Every artifact in this repository and in the shipped examples round-trips through the model unchanged — verified by `packages/doctrina-cli/test/doc-model.test.js`.
append-criterion [verified] `validate --fix` repairs a non-canonical header end to end and the finding clears — verified by `packages/doctrina-cli/test/doc-model.test.js`.
```
