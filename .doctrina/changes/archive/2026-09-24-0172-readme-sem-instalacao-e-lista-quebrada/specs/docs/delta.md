# Spec Delta — capability: docs

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/docs/spec.md`

---

O README é a porta: diz como instalar e leva a cada guia.

```ops
append-requirement ubiquitous: The system shall open each README, in English and in Portuguese, with the install command ahead of the flow diagram, and shall link every user guide of its language from one unbroken documentation list, so that a reader reaches any guide without knowing its file name.
append-criterion [verified] Both READMEs carry the install command before the flow diagram, link every guide of their language except the named exemptions, and strand no guide after the project-policy line — verified by `packages/doctrina-cli/test/o-readme-leva-a-cada-guia.test.js`.
bump-version minor
```
