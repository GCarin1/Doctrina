# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

O requisito dizia o que o sistema FAZ, na seção que existe para dizer o que
ele não deixa acontecer. A regra é a mesma; a frase passa a proibir.

```ops
replace-requirement unwanted 21: The system shall not let a `**Source:**` pattern that matches no file on disk pass unreported, because a claim over code that is not there reads as coverage and provides none.
bump-version patch
```
