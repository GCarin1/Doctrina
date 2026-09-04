# Tasks — 0030-declare-the-release-wiring-and-the-always-loaded

- [x] T1. Scaffold `.doctrina/contracts/system.md` and strip the template sections this project has no instance of (Ports: it is a CLI, not a service; Selectors: nothing dispatches on a test selector).
- [x] T2. Declare the release wiring: `NODE_AUTH_TOKEN` ← `secrets.NPM_TOKEN` in `.github/workflows/release.yml`, and record the rename as deliberate so the RT02 warning reads as documentation rather than a defect.
- [x] T3. Declare the two always-loaded ceilings as Budgets: the AGENTS.md line cap (output) and the context-pack token budget (input).
- [x] T4. Add an `expect` guard to the `test` check in `.doctrina/verify.json` so a run of zero tests fails the gate instead of passing it.
- [x] T5. `doctrina contract check` passes and reports a declared surface rather than an unchecked one; `doctrina doctor` shows the runtime row green.
- [x] T6. `doctrina verify` green end to end, and the guard proven to fire on an empty run.
