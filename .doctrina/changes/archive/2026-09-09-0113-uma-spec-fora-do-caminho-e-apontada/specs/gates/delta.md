# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

<!-- delta body below -->

Uma spec que não está onde a árvore a lê é apontada, com o caminho onde
deveria estar.

```ops
append-requirement event: When `.doctrina/specs/` holds a loose Markdown file, a capability directory without `spec.md`, or an extra Markdown file inside a capability directory whose title opens with `# Spec`, the system shall report a warning naming the file and the canonical path `.doctrina/specs/<capability>/spec.md`.
append-criterion [verified] A loose `specs/legacy.md`, a `specs/orfao/` without `spec.md` and a `specs/carteira/spec-old.md` each draw one validate warning with the canonical path, while a `notes.md` beside a `spec.md` is silent — verified by `packages/doctrina-cli/test/a-spec-off-the-path-is-named.test.js`.
bump-version minor
```
