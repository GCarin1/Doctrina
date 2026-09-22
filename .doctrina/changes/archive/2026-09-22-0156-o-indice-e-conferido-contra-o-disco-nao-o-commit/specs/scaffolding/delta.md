# Spec Delta — capability: scaffolding

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/scaffolding/spec.md`

---

O index é derivado da árvore inteira, então não descreve um pedaço dela.
Onde existe um commit, a deriva tem de ser medida contra ele.

```ops
append-requirement event: When `doctrina index rebuild --check --staged` runs, the system shall compare the staged index against the staged tree rather than the working tree — reporting every artifact the staged index names that the commit does not carry, and every staged artifact the index does not name — writing nothing, and exiting successfully when no index is staged or the project is not a git repository.
append-criterion [verified] A partial commit of `.doctrina/` is refused by name while a whole-tree commit passes, and the installed pre-commit hook asks that question after the step that stages the index — verified by `packages/doctrina-cli/test/o-indice-descreve-o-commit.test.js`.
bump-version minor
```
