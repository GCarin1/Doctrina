# Spec Delta — capability: insight

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/insight/spec.md`

---

O `constitution`, depreciado desde a 0.16.0, sai; o `prime --rules` é o único nome.

O `Source:`, o propósito e o critério 12 foram editados à mão: as ops cobrem
requisitos e cabeçalhos de estado, não a prosa.

```ops
replace-requirement event 4: When `doctrina prime --rules` runs, the system shall print the project's standing rules in full: every accepted ADR by number and title, and every non-goal declared in product.md, assembled read-only from the artifacts that own them; `doctrina constitution`, removed in 0.17.0, shall run nothing and refuse with the usage class, naming `doctrina prime --rules`.
bump-version minor
```
