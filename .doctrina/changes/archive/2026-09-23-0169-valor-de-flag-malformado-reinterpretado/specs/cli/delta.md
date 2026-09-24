# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

Um valor malformado é recusado, não reinterpretado.

```ops
append-requirement unwanted: The system shall not reinterpret a malformed flag value as a different request: a count that is not digits above zero, a `metrics --since` window that is not a day count, a real calendar date or "<n> <unit>s ago", and a negative number given to a value-taking flag are refused with the usage class, naming the value, because git reads any text as a date and a truncated number runs as a request nobody made.
append-criterion [verified] A window git would misread, a count with trailing text or a fraction, and a negative number after a value-taking flag each answer the usage class naming the value, while the documented forms still run — verified by `packages/doctrina-cli/test/um-valor-malformado-e-recusado.test.js`.
bump-version minor
```
