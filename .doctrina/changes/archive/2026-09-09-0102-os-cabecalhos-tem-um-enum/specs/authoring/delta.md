# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

<!-- delta body below -->

Os dois cabeçalhos que toda porta lê, e a marca de critério, ganham um
domínio declarado uma vez e imposto em cada operação que os escreve.

```ops
append-requirement ubiquitous: The system shall declare, in one place, the domain of the `Status` header (`draft`, `active`, `deprecated`), of the `Implementation` header (`planned`, `partial`, `implemented`, `verified`) and of the acceptance-criterion mark (`verified`, `unverified`, `orchestration`), and every operation that writes one of them — `spec set`, `set-header`, `set-criterion`, `append-criterion` — shall read that declaration.
append-requirement unwanted: The system shall not write a `Status`, `Implementation` or criterion mark whose state word is outside its domain; the operation fails and the spec is left untouched, while a note after a legal state word remains accepted.
append-criterion [verified] `spec set --status bogus`, `--implementation banana` and `--criterion 2:banana` are refused with the spec untouched, and a delta's `set-header`, `set-criterion` and `append-criterion` refuse the same values; a note after a legal word is accepted — verified by `packages/doctrina-cli/test/a-header-has-a-domain.test.js`.
bump-version minor
```
