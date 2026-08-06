# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

Audit item M7. Five of thirty-five commands spoke JSON; everything else
emitted ANSI-coloured prose while the primary consumer is a machine. With
the exit-code contract, the two halves form the machine interface.

```ops
bump-version minor
set-header Last updated: 2026-08-06
append-requirement ubiquitous: The system shall accept a JSON output flag on every command and emit a payload carrying a schema version, the invocation, a success flag, and the exit code.
append-requirement event: When a command with no structured payload of its own runs with the JSON flag, the system shall return its human output as string arrays inside the versioned envelope, with terminal colour removed.
append-requirement unwanted: The system shall not emit terminal colour codes in JSON output, and shall not let a command writing directly to the output stream escape the envelope.
append-criterion [verified] Every command declares the JSON flag and emits parseable output carrying the schema version, the command, and the exit code — verified by `packages/doctrina-cli/test/json-output.test.js`.
append-criterion [verified] The envelope's success flag and exit code agree with the process exit status, and JSON output carries no ANSI escapes even when colour is forced — verified by `packages/doctrina-cli/test/json-output.test.js`.
```
