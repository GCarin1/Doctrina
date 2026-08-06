# Spec Delta — capability: validation

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/validation/spec.md`

---

Audit item M6. Three of the nine corrections were invisible when the CLI
runs from its own repository and obvious from a packed install: adapters
were already present, templates resolved to the repo's own tree, and
`index.json` was the repo's rather than one `init` had just written.

```ops
bump-version minor
set-header Last updated: 2026-08-06
append-requirement ubiquitous: The system shall verify itself the way a user installs it, packing the CLI, installing the tarball outside the repository, and driving a project through the whole lifecycle with the installed binary.
append-requirement event: When the end-to-end harness runs, the system shall assert that the structural, template, and diagnostic gates are green at each lifecycle step, and that every bundled adapter installs into a project that passes its own checks.
append-criterion [verified] The packed-install harness drives init, spec, work, delta, check, close, and archive with the installed binary and asserts the gates at each step — `scripts/e2e-packed.mjs`.
append-criterion [verified] Pointed at the commit preceding the fixes, the harness reproduces the adapter data loss, the failing adapter check, the born-stale index, the ungated apply, and the git first-run error — `scripts/e2e-packed.mjs`.
```
