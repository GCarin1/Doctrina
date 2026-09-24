# Spec Delta — capability: docs

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/docs/spec.md`

---

A documentação acompanha o catálogo, e não o contrário.

```ops
append-requirement ubiquitous: The system shall keep the npm package README's command summary naming every live operation of the catalog, and shall not let any page teach a deprecated or removed command except in the lines that retire it, so that a merge or a removal cannot leave the prose instructing what the CLI warns about or refuses.
append-criterion [verified] The npm README's moment-grouped summary names every live operation, and a page that teaches a deprecated or removed command outside the lines retiring it fails the check — verified by `packages/doctrina-cli/test/a-documentacao-acompanha-o-catalogo.test.js`.
bump-version minor
```
