# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

Audit item M5. The CLI is 62 files of untyped ESM whose only safety net is a
test suite: a typo on a property, a helper called with the wrong arity, or a
function whose callers disagree about whether it returns null are all caught
only if a test happens to execute that branch.

```ops
bump-version minor
set-header Last updated: 2026-08-06
append-requirement ubiquitous: The system shall typecheck its own source with checkJs and shall emit nothing, so the published package stays plain ESM that node runs with no transpile step.
append-requirement ubiquitous: The system shall declare the shapes it passes between modules — the index record, the flag map, the artifact model, the context pack item — rather than relying on inference from a first use.
append-requirement event: When the declared verification checks run, the system shall run the typecheck first, before the test suite.
append-criterion [verified] `tsc --noEmit` reports zero errors across every file under `packages/doctrina-cli/src/` and `scripts/` — run by `doctrina verify` and by CI.
append-criterion [verified] Every source file under `src/` carries `// @ts-check`, so the file stays checked in an editor that does not load the project tsconfig — `packages/doctrina-cli/test/typecheck.test.js`.
append-criterion [verified] The published tarball contains no TypeScript configuration or type declarations, and the package declares no runtime dependencies — `packages/doctrina-cli/package.json`.
```
