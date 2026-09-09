# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

<!-- delta body below -->

O contrato de saída e o envelope valem também para os três que ficaram
para trás.

```ops
append-requirement event: When `close` is given a change id that does not resolve, the system shall refuse with the usage class before sequencing any step, as every other command that takes a change id does.
append-requirement ubiquitous: The system shall capture, into the `--json` envelope, every line a command writes to the process's standard error stream as well as to the console, with carriage returns stripped, so that the envelope carries what the terminal showed and standard output stays pure JSON.
append-criterion [verified] `close 0099` exits 2 without sequencing a step; `verify --json` with a check that writes to stderr yields pure JSON on stdout and an envelope carrying those lines without `\r`; `change tick <id> abc` names the argument — verified by `packages/doctrina-cli/test/the-stragglers-of-the-exit-contract.test.js`.
bump-version minor
```
