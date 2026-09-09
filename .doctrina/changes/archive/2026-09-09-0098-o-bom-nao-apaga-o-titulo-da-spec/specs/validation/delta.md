# Spec Delta — capability: validation

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/validation/spec.md`

---

A byte-order mark is an artifact of how the bytes were stored, not something
the Doctrina grammar has an opinion about. A spec saved by a Windows editor
opens `﻿# Spec — …`, and `validate` refused it for "carrying no title"
while `show`, `spec list` and `coverage` read the same file without
complaint.

The shape of the defect was disagreement between surfaces about a file none
of them had a real problem with — and the one that refused named a cause
that was not the cause. So the mark is removed once, at the single door
every module reads through, rather than taught to each parser.

```ops
append-requirement ubiquitous: The system shall remove a leading byte-order mark when reading any file, so that no surface treats an encoding artifact as content or as a missing heading.
append-criterion [verified] A spec, and an index.json, saved with a byte-order mark are read exactly as the same files without one — verified by `packages/doctrina-cli/test/a-byte-order-mark-is-not-content.test.js`.
append-criterion [verified] Marking every always-read artifact in a tree changes no gate's verdict, and a mark in the middle of a file is left alone — verified by `packages/doctrina-cli/test/a-byte-order-mark-is-not-content.test.js`.
bump-version patch
```
