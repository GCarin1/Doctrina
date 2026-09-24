# Spec Delta — capability: structure

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/structure/spec.md`

---

Na seção must-not a forma da frase É o sentido. A checagem passa a ler o
modal em vez de varrer a linha atrás de uma palavra.

```ops
append-requirement ubiquitous: The system shall read an unwanted-behavior requirement's negation from the modal it governs — "shall not", "shall never", or the object the verb negates directly — and shall not accept a negation word found elsewhere in the sentence as one, because an ordinary determiner then stands in for a prohibition.
append-criterion [verified] A requirement that merely contains "no" is reported under must-not while every form that negates the modal passes, and every must-not requirement in this repository forbids something — verified by `packages/doctrina-cli/test/uma-proibicao-nega-o-proprio-modal.test.js`.
bump-version minor
```
