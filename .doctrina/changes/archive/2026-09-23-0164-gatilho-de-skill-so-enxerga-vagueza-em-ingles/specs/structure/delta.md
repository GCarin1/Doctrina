# Spec Delta — capability: structure

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/structure/spec.md`

---

A regra que a change 0158 escreveu para os léxicos do `clarify` vale para
toda leitura de prosa que o framework faz: a vagueza está escrita na língua
do projeto.

```ops
append-requirement ubiquitous: The system shall judge a skill's trigger by the same standard in every language it supports — mirrored phrase lists matched against folded text, and content words counted by the shared lexicon — and shall not decide vagueness from a list that carries one language only.
append-criterion [verified] The same vague trigger is reported in English and in Portuguese, an accent does not change the answer, a concrete trigger passes in either language, and the module counts content words through the shared lexicon — verified by `packages/doctrina-cli/test/um-gatilho-vago-e-vago-nas-duas-linguas.test.js`.
bump-version minor
```
