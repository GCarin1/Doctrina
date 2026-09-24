# Spec Delta — capability: structure

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/structure/spec.md`

---

A terceira declaração da mesma forma passa a ser cobrada como as outras
duas: uma que não alcança nada lê como cobertura e não entrega nenhuma.

```ops
append-requirement event: When `doctrina validate` enforces the project's rules, the system shall warn for a rule whose declared paths reach no file, because the constraint is then declared and never enforced; a rule that declares no paths covers the tree and shall not be reported.
append-criterion [verified] A rule scoped to a path that matches nothing is reported while a rule that reaches files, one that finds a violation, one that declares no scope, and one suppressed by its own hit cap each keep their answer — verified by `packages/doctrina-cli/test/uma-regra-que-nao-alcanca-nada.test.js`.
bump-version minor
```
