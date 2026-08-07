# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

The typecheck gate shipped as `npx tsc --noEmit`. On a machine with no
local TypeScript — which is every CI job in this repository, because the CLI
has zero runtime dependencies and nothing ever installed anything — `npx`
does not fail. It DOWNLOADS an unrelated, deprecated package named `tsc`
from the registry and runs that instead.

```ops
bump-version patch
set-header Last updated: 2026-08-06
append-requirement unwanted: The system shall not invoke a gate through a resolver that installs a missing package from a registry; a gate whose tool is absent shall fail loudly rather than run something fetched in its place.
append-requirement ubiquitous: The system shall declare every dependency a gate needs, and its automation shall install them from the lockfile before running the gate.
append-criterion [verified] The test suite passes on a checkout with no node_modules, skipping the typecheck rather than fetching a compiler — `packages/doctrina-cli/test/typecheck.test.js`.
append-criterion [verified] No workflow or verification check invokes a gate tool through `npx` — `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `.doctrina/verify.json`.
```
