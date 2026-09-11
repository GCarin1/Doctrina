# Spec Delta — capability: templates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/templates/spec.md`

---

Há uma árvore de templates autorada e um passo de empacotamento — não duas
cópias. O requisito passa a dizer isso, e a prova passa a cobrar a cadeia
que publica, que é a que quebra calada.

O texto do critério 29 é reescrito à mão: os verbos de `ops` marcam um
critério (`verified`/`unverified`), não reescrevem o enunciado, e o
enunciado que a 0149 deixou afirma uma igualdade entre duas árvores que
não existe. A marca continua `verified`; muda o que ela prova.

```ops
set-header Source: `packages/doctrina-cli/src/lib/{templates,templates-model,playbook,agent-changelog}.js`, `packages/doctrina-cli/scripts/copy-templates.js`, `.doctrina/templates/**`
replace-requirement ubiquitous 21: The system shall generate the published package's template tree from the canonical tree at pack time, keeping the canonical tree the only authored copy, so that a template fix cannot land on one tree and miss the other.
bump-version patch
```
