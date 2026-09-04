# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

The gate surface gains the RUNTIME half: the declared wiring, enums and
selectors checked against the workflows and code meant to honour them,
the fail-closed verify expectation, the orchestration criterion, and the
budget refusal. See ADR 0023 and ADR 0024.

```ops
append-requirement ubiquitous: The system shall check the runtime surface only as the project declares it in a contract, and shall never parse a specific CI system, test runner, or language.
append-requirement ubiquitous: The system shall report a project whose contracts declare no wiring or selector rows as having an UNCHECKED runtime surface, and shall not report it as passing.
append-requirement event: When `doctrina contract check` runs, the system shall verify each declared wiring row against the named workflow, report a variable no env: block exports as an error, and report an origin or name mismatch between the contract and the workflow.
append-requirement event: When a declared variable's origin is one a CI provider can inject as an empty string, the system shall lint the declared consumer for a default that applies only when the variable is absent, and shall state in the finding that the check is textual.
append-requirement event: When a contract declares a Values enum, the system shall report an `.env.example` value outside that set as an error and a consumer that mentions no member of it as a warning.
append-requirement event: When a contract declares a selector, the system shall extract candidates from the declared source glob using the declared pattern and report a selector matching zero targets as an error, naming a near-miss when only the separator differs.
append-requirement event: When a verify check declares an output expectation, the system shall read that check's output and fail the check when the output matches a declared failure pattern or fails to match a declared required pattern, even though the command exited zero.
append-requirement event: When a verify check declares an output expectation that is not a valid regular expression, the system shall fail at configuration time with the usage exit code rather than skipping the expectation.
append-requirement event: When an acceptance criterion is marked `[orchestration]`, the system shall treat it as covered only when it cites a verify check that declares an output expectation, and shall report it as unguarded otherwise.
append-requirement event: When `doctrina analyze <change-id>` runs, the system shall refuse a change whose text raises a declared OUTPUT budget above the ceiling its contract records.
append-requirement event: When `doctrina validate --runtime` runs, the system shall run the same runtime checks as `contract check` in addition to the structural checks, and shall report their errors as validation errors.
append-requirement event: When `doctrina doctor` runs, the system shall report the runtime surface as one further diagnostic row, and with `--env` shall additionally check the local `.env` against the declared names and enums.
append-requirement must-not: The system shall not print the value of an environment variable when reporting a local `.env` finding; it shall name the variable and the allowed set only.
append-requirement must-not: The system shall not report a workflow it cannot read as one that omits a declared variable; it shall report the file as unreadable instead.
append-criterion [verified] A declared wiring row whose workflow exports nothing fails `contract check` with RT01, and passes once the env: line exists — verified by `packages/doctrina-cli/test/runtime.test.js`.
append-criterion [verified] A consumer default that an empty CI value never triggers is reported (RT03), while an empty-safe form is not — verified by `packages/doctrina-cli/test/runtime.test.js`.
append-criterion [verified] A selector matching zero targets fails with RT05 and names the separator near-miss — verified by `packages/doctrina-cli/test/runtime.test.js`.
append-criterion [verified] A verify check that exits 0 having printed "0 scenarios" fails the gate, and passes once the run is real — verified by `packages/doctrina-cli/test/runtime-commands.test.js`.
append-criterion [verified] An orchestration criterion citing a check with no expect guard is reported unguarded and fails `coverage --strict` — verified by `packages/doctrina-cli/test/orchestration.test.js`.
append-criterion [verified] `analyze` refuses a change that raises a declared output ceiling and stays silent on an input ceiling — verified by `packages/doctrina-cli/test/orchestration.test.js`.
append-criterion [verified] `doctor --env` reports enum membership without the offending value appearing in its output — verified by `packages/doctrina-cli/test/runtime.test.js`.
bump-version minor
```
