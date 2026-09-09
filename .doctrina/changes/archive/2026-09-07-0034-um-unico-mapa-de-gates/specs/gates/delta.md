# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

<!-- delta body below -->

ADR 0017 promised one gate map and `lib/gates.js` delivered it for the two
mutating transitions only. `close` carried its own array of steps, `doctor`
its own rows, and `action.yml` its own YAML — three more lists, no mechanism
that noticed a divergence. This delta widens the existing "declare in one
place" requirement from transitions to SEQUENCES, and states what the three
surfaces may and may not do with that declaration.

```ops
replace-requirement ubiquitous 3: The system shall declare in one place which gates guard which lifecycle transition and which steps make up each gate sequence, and every command or pipeline that drives one shall render that declaration rather than carrying its own list.
append-requirement event: When a gate sequence is rendered by a surface, the system shall take the steps, their order, and each step's level from the declaration, and shall run a declared step that the surface binds no handler to by invoking the command the declaration names.
append-requirement event: When `doctrina ci --emit <target>` runs, the system shall write the CI pipeline for the declared sequence to stdout, exiting with the usage code for an unknown or missing target, and shall write no file of its own.
append-requirement unwanted: The system shall not let a surface invent, drop, or reorder a step of a declared gate sequence.
append-criterion [verified] The close sequence, the doctor rows, and the emitted CI pipeline all derive from the single declaration, and a surface that starts carrying its own copy fails the suite — verified by `packages/doctrina-cli/test/gate-sequences.test.js`.
append-criterion [verified] A step added to the declaration reaches the CI surface with no further edit, in declared order — verified by `packages/doctrina-cli/test/gate-sequences.test.js`.
append-criterion [verified] `doctrina ci --emit github` reproduces the versioned `action.yml` byte for byte, so a stale file fails the build instead of shipping — verified by `packages/doctrina-cli/test/gate-sequences.test.js`, `action.yml`.
bump-version minor
```
