# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

Audit item D2. Documentation was checkable (D1) but never required: a
change could add a flag and close green with no page describing it. The
requirement moves inside the close, where the work is, refusable with
`--force` and recorded like every other declared gap.

```ops
bump-version minor
set-header Last updated: 2026-08-06
append-requirement event: When `doctrina close` runs on a change that alters a documented surface — a command, a flag, or an exit code named in the change's own proposal or deltas — the system shall refuse to close unless the same work also touches `docs/` or a README, and `--force` shall close anyway and record the gap in the archive ledger.
append-requirement unwanted: The system shall not raise the documentation gate from the scaffolded boilerplate of a change; only content the author wrote counts as a documented-surface signal.
append-requirement unwanted: The system shall not raise the documentation gate outside a git repository, where it cannot tell what moved.
append-criterion [verified] A change altering a documented surface with no accompanying documentation is refused by `doctrina close`, closes under `--force`, and the gap is written to the ledger — verified by `packages/doctrina-cli/test/integration.test.js`.
append-criterion [verified] Scaffold boilerplate raises no documentation signal, so the gate stays quiet on a change that touches no documented surface — verified by `packages/doctrina-cli/test/docs-impact.test.js`, `packages/doctrina-cli/test/integration.test.js`.
```
