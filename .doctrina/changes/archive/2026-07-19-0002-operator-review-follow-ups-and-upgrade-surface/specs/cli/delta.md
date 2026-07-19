# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

Operator-review follow-ups (2026-07-19) + the upgrade-fidelity gap: the
EARS requirement verbs close the manual-merge bottleneck, the
doctrina:surface block closes the agent-discovery gap (ADR 0015), and
check/tick/batch remove the mechanical friction of closing. This delta
itself dogfoods the new verbs — everything below applies mechanically.

<!-- APPLIED 2026-07-19 by `doctrina change apply` (13 ops, spec 0.25.0 → 0.26.0).
The ops block is preserved for history inside this comment, which apply
ignores, because ops are not idempotent — re-applying would duplicate the
bullets and bump the version again. The first apply also exposed a real
bug the gates caught: append-* used to insert between a wrapped item's
first line and its continuation lines (fixed in spec-ops.js, endOfItem).

```ops
bump-version minor
set-header Last updated: 2026-07-19
append-requirement ubiquitous: The system shall support the EARS requirement verbs `append-requirement <section>: <text>` and `replace-requirement <section> <n>: <text>` in a MODIFIED delta's ops block, resolving bullet position and numbering at apply time so concurrent open changes appending to the same spec cannot collide.
append-requirement event: When `doctrina change check <id...>` runs, the system shall report, read-only: analyze's structural findings, every MODIFIED delta's ops block executed in memory against its target spec, the archive-gate blockers, and an advisory list of accepted ADRs whose text cites the touched capabilities.
append-requirement event: When `doctrina change tick <id>` runs, the system shall list the unchecked boxes of `tasks.md` and the proposal's `## Verification` section in one ordinal space, and shall check the boxes named by ordinal arguments or every box under `--all`.
append-requirement event: When `doctrina work` runs with `--capability <cap>`, the system shall scaffold `specs/<cap>/delta.md` inside the change with the `**Operation:**` header prefilled (MODIFIED when the target spec exists, ADDED when it does not), and under `--quiet` shall print a one-line confirmation instead of the playbook.
append-requirement event: When `doctrina close`, `doctrina change apply`, `doctrina change archive`, or `doctrina change check` receive multiple ids, the system shall run each id independently and exit with the worst per-id result.
append-requirement event: When `doctrina close` runs, the system shall print an advisory ADR checkpoint (accepted ADRs whose text cites the touched capabilities, with the amend commands) after analyze, and an advisory `skill suggest` listing after validate; neither shall block the close.
append-requirement event: When `doctrina clarify` runs with `--lang pt` or `--lang en`, the system shall apply that lexicon regardless of the project config and the per-file stopword heuristic.
append-requirement event: When `doctrina templates update --write` or `doctrina upgrade --write` runs, the system shall regenerate the marker-delimited doctrina:surface block of AGENTS.md from the installed command catalog — replacing a legacy hand-written surface section — while writing nothing outside the markers (ADR 0015).
append-requirement event: When `doctrina validate` finds an open change's delta whose `**Operation:**` header is missing or not one of ADDED, MODIFIED, or REMOVED, the system shall warn, naming the file and the fix.
append-requirement unwanted: The system shall not execute an ops block that sits inside an HTML comment of a delta (the scaffolded template carries an example block in its instructional comment).
append-criterion [verified] Operator-review follow-ups behave as specified: change check/tick, batch ids on close/apply/archive/check, the prefilled work delta and `--quiet`, the close advisories, `clarify --lang`, the regenerated doctrina:surface block, and the EARS requirement verbs — verified by `packages/doctrina-cli/test/integration.test.js`, `packages/doctrina-cli/test/spec-ops.test.js`, `packages/doctrina-cli/test/commands.test.js`.
```
-->

The spec state after apply (with the wrapped-item placement repaired) is
the truth on disk at `.doctrina/specs/cli/spec.md`, version 0.26.0.
