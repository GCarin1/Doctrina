# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

<!-- delta body below -->

Um artefato ainda na forma do scaffold é nomeado pelo gate que sempre
roda, como já acontece com specs e tasks.

```ops
append-requirement event: When a contract's Wiring, Selectors or References rows are still the scaffold's placeholders (`<NAME>`, `specs/<capability>`), or a skill's `description:` or `when:` frontmatter is still in the scaffold's `<...>` form, the system shall report a warning naming the artifact and the placeholder.
append-criterion [verified] A freshly scaffolded contract and a freshly scaffolded skill each draw one validate warning naming the placeholder, and the warnings go silent once the rows and the frontmatter are written — verified by `packages/doctrina-cli/test/a-scaffold-is-not-an-artifact.test.js`.
bump-version minor
```
