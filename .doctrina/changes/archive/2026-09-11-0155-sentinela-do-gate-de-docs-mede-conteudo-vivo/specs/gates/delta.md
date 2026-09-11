# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

Um teste que mede a sensibilidade de um gate contra o acervo do projeto
mede algo que cresce — e o próprio fechamento é quem o aumenta.

```ops
append-requirement ubiquitous: The system shall measure a gate's sensitivity against a fixed sample of the project's own history, excluding the artifacts that silence the gate by declaration, so that ordinary new work cannot move the measurement and only a weakened check can.
append-criterion [verified] The docs gate's sensitivity sentinel reads a chronological prefix of the archive and skips proposals carrying a documented-surface declaration, so closing a change does not change what it measures — verified by `packages/doctrina-cli/test/citing-a-command-is-not-changing-it.test.js`.
bump-version minor
```
