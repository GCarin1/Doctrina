# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

A change 0128 fez o CI disparar também em `develop` e escreveu o teste que
guarda isso. Por ser da faixa chore, não produziu critério, então a prova
existe e nenhuma spec a cita: `coverage` não a conhece e `review` reporta
o arquivo como pertencente a nenhuma capacidade.

O invariante é real — um gate que não roda onde o trabalho chega não é um
gate — e merece estar escrito onde os outros estão.

```ops
bump-version minor
set-header Last updated: 2026-09-11
append-requirement ubiquitous: The system's own pipeline shall run its gates on every branch that receives merged work, not only on the branch that publishes.
append-criterion [verified] The declared triggers name every branch work lands on, and removing one fails the suite — verified by `packages/doctrina-cli/test/the-ci-gate-runs-where-work-lands.test.js`.
```
