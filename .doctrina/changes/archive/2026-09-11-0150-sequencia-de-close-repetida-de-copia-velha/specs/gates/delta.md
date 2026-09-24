# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

A sequência tem um autor só, e quem a mostra a renderiza de lá.

```ops
append-requirement ubiquitous: The system shall render a gate sequence it shows from the one declaration that runs it, deriving each step's advisory or forceable marker from the step's declared level rather than from the label's text.
append-criterion [verified] The close command's help names every declared step, in the order the close runs them, and any governed prose that spells the closing sequence out names all of it — verified by `packages/doctrina-cli/test/a-sequencia-tem-um-autor-so.test.js`.
bump-version minor
```
