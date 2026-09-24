# Spec Delta — capability: scaffolding

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/scaffolding/spec.md`

---

O `index.json` é escrito por dois caminhos: incrementalmente, pelo comando
que cria o artefato, e por inteiro pelo `index rebuild`, que percorre o
diretório e escreve o que encontra, na ordem de `readdirSync(...).sort()`.

Os dois só concordavam por sorte. Acrescentar no fim coincide com uma
varredura ordenada exatamente quando a entrada nova ordena por último.

```ops
bump-version minor
set-header Last updated: 2026-09-11
append-requirement ubiquitous: The system shall write an artifact into the index in the position a full rebuild would give it, comparing the way the directory walk compares, so that the incremental write and the rebuild never disagree.
append-criterion [verified] A spec, a skill and an archived change that sort before an existing entry each land in walk order and leave `index rebuild --check` clean, punctuation included — verified by `packages/doctrina-cli/test/the-index-is-written-once.test.js`.
```
