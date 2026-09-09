# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

<!-- delta body below -->

Evidência é um arquivo dentro do projeto; o que não é, é dito.

```ops
append-requirement ubiquitous: The system shall accept as evidence for an acceptance criterion only a cited path that resolves to a file inside the project root; a path that resolves outside the root, or to a directory, shall be reported as not resolving, with the reason.
append-requirement event: When a covered criterion also cites a file path that does not resolve, the system shall keep the criterion covered and name the path that does not resolve, while a directory cited next to a resolving proof is read as a prose mention and not reported.
append-criterion [verified] A path outside the project, an absolute path and a directory leave a criterion dangling with the reason named; a criterion citing one resolving file and one missing file is covered with the missing one named; a directory next to a real proof is silent — verified by `packages/doctrina-cli/test/proof-lives-in-the-project.test.js`.
bump-version minor
```
