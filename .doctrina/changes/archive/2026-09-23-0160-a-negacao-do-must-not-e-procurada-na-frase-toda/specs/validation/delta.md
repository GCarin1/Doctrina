# Spec Delta — capability: validation

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/validation/spec.md`

---

Mesma correção de forma: uma obrigação positiva arquivada em must-not passa
a ser a proibição que ela sempre significou.

```ops
replace-requirement unwanted 6: The system shall not treat an artifact it owns that holds no content, or content with no title heading, as a well-formed artifact; it shall report an error, because a header comparison finds nothing to disagree with in a file that has no headers.
bump-version patch
```
