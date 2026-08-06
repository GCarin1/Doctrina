# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

Audit item C7, ADR 0018. Exit code 1 meant "the work is not ready", "the
project is not configured", and "this machine cannot run this" — three
answers requiring three different responses, indistinguishable to the
machine consumer the framework is built for.

```ops
bump-version minor
set-header Last updated: 2026-08-06
append-requirement ubiquitous: The system shall exit with one of five documented classes: 0 success, 1 a failed gate, 2 a wrong invocation, 3 a missing precondition, 4 an environment that cannot run the command.
append-requirement ubiquitous: The system shall define the exit-code classes in one module, print them in the top-level help from that same definition, and document them in the user-facing reference.
append-requirement event: When a command cannot run because the project is not set up, the system shall exit with the precondition class and name the setup command that clears it.
append-requirement unwanted: The system shall not report a missing precondition or an unusable environment with the same code as a failed gate.
append-criterion [verified] A representative failure of each class returns its documented code, and the top-level help prints the contract — verified by `packages/doctrina-cli/test/exit-codes.test.js`.
append-criterion [verified] Every literal exit return in a command module maps to a documented class — verified by `packages/doctrina-cli/test/exit-codes.test.js`.
```
