# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

O entrypoint terminava em `process.exit(code)`. Quando stdout é um pipe,
o Node pode ainda não ter entregue os bytes ao sistema operacional quando
aquele callback roda, e `process.exit` derruba o processo na hora,
perdendo o que estava pendente.

A saída de um comando é a saída dele inteira ou não é a saída dele.

```ops
bump-version minor
set-header Last updated: 2026-09-11
append-requirement unwanted: The system shall not end a run in a way that discards output it has already printed; a command's bytes shall reach stdout before the process exits, whether stdout is a terminal, a file, or a pipe.
append-criterion [verified] A long `--concat` pack arrives whole through a pipe, byte for byte identical to the same pack written to a file, and the entrypoint sets an exit code rather than calling `process.exit` — verified by `packages/doctrina-cli/test/the-output-survives-the-exit.test.js`.
```
