# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

The envelope names the operation, and answers even when it refuses.

`command` carried the operation and its arguments run together, so the field
a consumer branches on took a different value for every capability —
`"why carteira"`, `"show 0001"`, `"change check 0031-x"` — while `next
--json` documents `command`/`args` as the contract. The envelope contradicted
the payload it wrapped. What separates a sub-operation (`spec list`) from an
argument (`why carteira`) is the catalog, not the shape, which is the same
reason usage recording consults it.

And a flag the command does not declare is refused before the envelope
exists, so a consumer that asked for JSON received an empty stdout and a
parse error rather than a refusal it knows how to read.

```ops
append-requirement ubiquitous: The system shall name the invoked operation alone in the JSON envelope's command field, carrying any arguments separately, so a consumer branches on one stable value.
append-requirement event: When an invocation is refused for an undeclared flag and JSON output was requested, the system shall emit the envelope reporting the refusal and its exit code rather than an empty payload.
append-criterion [verified] An argument lands in `args` and never in `command`, and a sub-operation stays whole with no `args` key — verified by `packages/doctrina-cli/test/the-envelope-names-the-operation.test.js`.
append-criterion [verified] An unknown flag with the JSON flag emits an envelope carrying `ok: false`, the usage exit code and what it refused — verified by `packages/doctrina-cli/test/the-envelope-names-the-operation.test.js`.
bump-version minor
```
