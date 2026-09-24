# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

O que o CLI imprime para ser rodado a seguir é um comando vivo.

```ops
append-requirement ubiquitous: The system shall never tell a person to run a deprecated command from its own output — a `--help` text, a closing hint, a validation warning — except on a line that says the name is deprecated, because a deprecated name keeps working and nothing else would catch the CLI teaching the path it retired.
append-requirement ubiquitous: The system shall label the first step of the closing sequence by the gate it holds, `structure`, in `close --help` and in the close's own output, and shall name `doctrina change check <id>` as its rerun.
append-criterion [verified] No live command's `--help` names a deprecated command as a step or as a `doctrina <op>` to run, `work --help` ends in `change check` and `close`, `close --help` opens on `structure`, `skill new` points at `doctrina index rebuild`, and the `validate` warnings for a delta without an operation and for placeholder tasks name `change apply`, `change check` and the close instead of `analyze` — verified by `packages/doctrina-cli/test/o-cli-nao-indica-comando-depreciado.test.js`.
bump-version minor
```
