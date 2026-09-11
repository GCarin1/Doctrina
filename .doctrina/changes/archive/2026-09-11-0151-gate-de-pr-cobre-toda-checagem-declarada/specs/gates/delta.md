# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

Uma checagem declarada e não executada antes da integração é uma checagem
que só fala quando já não adianta.

```ops
append-requirement ubiquitous: The system shall run every check the project declares in its verify configuration on every pull request, so that no declared check first reports after the work has been integrated.
append-criterion [verified] Every check declared in this repository's verify configuration appears in the pull-request workflow or in the gates action it invokes — verified by `packages/doctrina-cli/test/toda-checagem-declarada-roda-no-ci.test.js`.
bump-version minor
```
