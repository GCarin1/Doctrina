# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

O `next` manda consertar o índice antes de qualquer outra coisa.

```ops
replace-requirement event 2: When `doctrina next` runs, the system shall inspect the `.doctrina/` tree and print the recommended next workflow actions in priority order: runtime declarations that no longer hold, a pending `.doctrina/intake.md` (not yet `converted`) or an unspecced project, index drift — a `validate` error that blocks the close, fixed by one runnable command, and read by every action below it — then open changes (missing proposal, unchecked tasks, deltas ready to apply, applied but not archived), ADRs still in `proposed` status, accepted ADRs with neither `Evidence` nor `Landed` proving them (suggesting `decision land`), and a single skill-capture nudge when no skill exists yet and an archived change is fix-shaped. When no work is open the system shall say so and point at `doctrina work "<prompt>"`, or at `doctrina intake` for a project with nothing specced. With `--json` the system shall emit the action list as JSON. The command is strictly read-only and shall exit 0.
append-criterion [verified] With an open change and a drifted index, `next` lists the index rebuild first — verified by `packages/doctrina-cli/test/actions.test.js`.
bump-version minor
```
