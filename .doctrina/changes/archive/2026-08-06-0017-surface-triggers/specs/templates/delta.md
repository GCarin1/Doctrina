# Spec Delta — capability: templates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/templates/spec.md`

---

Audit item M2, ADR 0020. The generated surface block solved WHICH commands
exist and not WHEN to use them, so learning the surface still meant running
`--help` 35 times. And when a command shipped, nothing told the agent
anything had changed.

```ops
bump-version minor
set-header Last updated: 2026-08-06
append-requirement ubiquitous: The system shall require every command to declare a purpose and a when-trigger, and shall generate the AGENTS.md surface block from those declarations, organised by the moment the command is reached for.
append-requirement ubiquitous: The system shall hold the generated surface block to a declared line budget, reporting an overrun as a finding rather than growing the block.
append-requirement event: When a project is scaffolded or upgraded, the system shall write a marker-delimited agent-facing changelog naming only what alters agent behaviour in the installed version.
append-requirement unwanted: The system shall not place a generated block inside another generated block; a marker comment ends the preceding section just as a heading does.
append-criterion [verified] Every command declares a purpose, a when-trigger, and a known moment, and the block carries those triggers within its declared budget — verified by `packages/doctrina-cli/test/commands.test.js`.
append-criterion [verified] The agent-facing changelog is three to six agent-scoped bullets for the running version, written at init and refreshed by upgrade — verified by `packages/doctrina-cli/test/commands.test.js`, `packages/doctrina-cli/test/integration.test.js`.
```
