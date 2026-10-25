# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

```ops
append-requirement unwanted: The system shall not print the full skill-candidate listing at the end of a close: once per run, it shall name the candidate a just-closed fix-shaped change produced and count every other one, printing nothing when there is none.
append-criterion [verified] Closing two changes in one run prints one skills section naming the just-closed fix-shaped change and counting three older candidates without listing them, and the docs step prints its line once — verified by `packages/doctrina-cli/test/o-close-nao-se-repete.test.js`.
bump-version minor
```
