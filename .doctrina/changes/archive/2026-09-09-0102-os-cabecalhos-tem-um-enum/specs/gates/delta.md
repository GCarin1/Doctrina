# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

<!-- delta body below -->

O `validate` lê o mesmo domínio que as operações de escrita, para que um
valor digitado à mão fora dele não atravesse o gate.

```ops
append-requirement event: When a spec's `Status` or `Implementation` header, or an acceptance-criterion mark, carries a state word outside the declared domain, the system shall report an error that names the header or criterion, the value found and the legal values.
append-criterion [verified] A hand-written `Status: bogus` and a `[banana]` mark are reported by `validate` as errors naming the legal values, while `planned — deferred` passes — verified by `packages/doctrina-cli/test/a-header-has-a-domain.test.js`.
bump-version minor
```
