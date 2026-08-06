# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

ADR 0022 needs ADRs to carry a scope, and nobody hand-annotates a folder of
immutable documents. The archived change that cites an ADR already records
which specs it touched, so a scope can be proposed from the ledger.

```ops
bump-version minor
set-header Last updated: 2026-08-06
append-requirement event: When `doctrina decision scope` runs, the system shall report the capabilities each ADR governs and propose one for each unscoped ADR from the archived change that cites it, applying them only under --write.
append-requirement ubiquitous: The system shall derive a decision's index record in exactly one place, so that creating an ADR and rebuilding the index produce the same record.
append-requirement ubiquitous: The system shall carry index.json's config block through an index rebuild, since it has no on-disk source to be rederived from.
append-requirement unwanted: The system shall not accept a value-taking flag written without a value; it shall report a usage error rather than fall back to the default.
append-criterion [verified] `decision scope` proposes from the ledger, prefers it over text matching, and writes only under --write — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
append-criterion [verified] `decision new` and `index rebuild` produce the same record, so a freshly created ADR is never index drift — verified by `packages/doctrina-cli/test/integration.test.js`.
append-criterion [verified] A project's context_budget survives `index rebuild`, and --budget overrides it — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
```
