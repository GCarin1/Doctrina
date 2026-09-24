# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

Um critério de aceitação tem duas metades que querem dizer coisas
opostas: o que ele DESCREVE e o que ele CITA. A gramática separa as duas
com "verified by".

O extrator de evidências não enxergava a separação, então um critério que
descreve a entrada ruim pelo nome era lido como se estivesse oferecendo
aquela entrada como prova.

```ops
bump-version minor
set-header Last updated: 2026-09-11
append-requirement event: When a criterion cites its proof after a citation marker, the system shall read only the paths in that citation as claims of evidence, and shall treat the paths named before it as the scenario the criterion describes.
append-criterion [verified] A path named before `verified by` draws no unresolved-evidence note, a second path cited after it still does, and a criterion with no marker keeps every cited path as a claim — verified by `packages/doctrina-cli/test/proof-lives-in-the-project.test.js`.
```
