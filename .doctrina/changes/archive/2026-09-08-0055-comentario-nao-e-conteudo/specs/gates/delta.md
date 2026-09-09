# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

<!-- delta body below -->

## What changes

The docs gate reads the change's own artifacts for documented-surface
signals. It subtracts the shipped templates' boilerplate first; a comment
that is not template text — the `RANKED GUESS` note a guessed delta carries
— slipped past that subtraction and named a command. Comments are now
blanked before the scan, so the gate fires on what the author wrote.

```ops
bump-version patch
append-requirement unwanted: The system shall not derive a documented-surface signal from text inside an HTML comment when deciding whether a change must carry documentation.
append-criterion [verified] A change scaffolded on the default path, whose guessed delta names `doctrina work` inside its guess comment, produces no command signal, while a command the author wrote outside a comment still does — verified by `packages/doctrina-cli/test/comment-is-not-content.test.js`.
```
