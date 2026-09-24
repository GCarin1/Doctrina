# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

`lib/names.js` é a gramática de nome que `spec new`, `contract new` e
`skill new` usam. Ela passa a ser declarada por quem a usa.

```ops
set-header Source: `packages/doctrina-cli/src/commands/{intake,work,spec,change,decision,contract,skill,intent,triage}.js`, `packages/doctrina-cli/src/lib/{change-ops,spec-ops,work-model,triage-model,intake-model,lexicon,adr-guard,criteria,names}.js`
append-criterion [verified] Every tracked source file in this repository is claimed by a capability's declared `Source:` header, and a file a spec merely mentions does not read as declared — verified by `packages/doctrina-cli/test/code-has-an-owner.test.js`.
bump-version patch
```
