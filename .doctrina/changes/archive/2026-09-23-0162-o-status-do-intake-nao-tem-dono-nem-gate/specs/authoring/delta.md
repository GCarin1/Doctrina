# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

O bootstrap passa a ser encerrado por comando. Era o único cabeçalho de
metadado que o framework mandava o agente escrever à mão.

```ops
append-requirement event: When `doctrina intake --converted` runs, the system shall write the stored intake's Status header itself, so the bootstrap is closed through the CLI rather than by hand-authoring a metadata header, and shall answer the precondition class when there is no intake to mark.
append-criterion [verified] The command closes the bootstrap and `next` stops asking for it, marking one that never started costs the precondition class, and the bootstrap playbook names the command instead of the file — verified by `packages/doctrina-cli/test/o-status-do-intake-tem-dono.test.js`.
bump-version minor
```
