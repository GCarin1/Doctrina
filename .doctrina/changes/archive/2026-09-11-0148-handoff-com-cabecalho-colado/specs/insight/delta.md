# Spec Delta — capability: insight

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/insight/spec.md`

---

Uma vista que existe para ser colada noutro lugar tem de sair como
Markdown válido, em qualquer estado da árvore — não só no estado em que
o autor a olhou.

```ops
append-requirement ubiquitous: The system shall separate every heading of a Markdown view from the line before it with a blank line, in every state of the tree, so the document renders where it is pasted.
append-criterion [verified] No heading in the `handoff` or `report` document is glued to the preceding line, with open changes and with none — verified by `packages/doctrina-cli/test/o-handoff-e-markdown-valido.test.js`.
bump-version minor
```
