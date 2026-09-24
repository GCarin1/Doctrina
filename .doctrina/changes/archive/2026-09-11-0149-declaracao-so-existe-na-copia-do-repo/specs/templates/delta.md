# Spec Delta — capability: templates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/templates/spec.md`

---

A árvore de templates que vai no pacote passa a ter dono declarado e a
carregar a mesma orientação que este repositório lê da sua cópia.

```ops
set-header Source: `packages/doctrina-cli/src/lib/{templates,templates-model,playbook,agent-changelog}.js`, `packages/doctrina-cli/templates/**`, `.doctrina/templates/**`
append-requirement ubiquitous: The system shall carry a template's guidance in the tree it ships, so that a project scaffolding from the package reads the same guidance the framework's own repository reads from its override.
append-criterion [verified] The shipped template tree and this repository's override hold the same files with the same bytes, and a change scaffolded from the shipped proposal template still trips the documented-surface gate — verified by `packages/doctrina-cli/test/o-template-que-envia-e-o-que-vale.test.js`.
bump-version minor
```
