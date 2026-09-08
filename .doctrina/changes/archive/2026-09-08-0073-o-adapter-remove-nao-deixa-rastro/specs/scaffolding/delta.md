# Spec Delta — capability: scaffolding

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/scaffolding/spec.md`

<!--
For ADDED: include the full new spec body below. On apply, the body is
written verbatim to the target path.

For MODIFIED: prefer a fenced `ops` block — on apply the CLI executes it
against the target spec, all ops or none (ADR 0007). The verbs cover
headers, acceptance criteria, AND the EARS requirement bullets, so a
typical delta applies mechanically end to end; only free-prose rewrites
(Purpose, Maturity, ...) stay a by-hand merge. A MODIFIED delta with no
`ops` block prints a manual-merge pointer.

  ```ops
  set-header Implementation: verified — durable adapter (`src/db.ts`)
  bump-version minor
  set-criterion 1: verified
  append-criterion [unverified] new signal — verified by `test/x.test.ts`
  append-requirement event: When <trigger>, the system shall <action>.
  replace-requirement ubiquitous 2: The system shall <action>.
  ```

Requirement sections: ubiquitous | event | state | unwanted | optional.
append-* ops resolve numbering/position at APPLY time, so several open
changes appending to the same spec never collide on numbers — order of
application decides.

For REMOVED: the body may be empty; on apply, the target spec file is
deleted and the capability is recorded in the change archive only.
-->

---

<!-- delta body below -->

```ops
replace-requirement event 26: When `doctrina adapter remove <name>` runs, the system shall delete only files that adapter created, shall keep any file edited since install unless `--force` is given, and shall then remove every directory it emptied, walking up and stopping at the first directory that still holds anything.
set-criterion 1: [verified] `adapter add` leaves `AGENTS.md` and `.doctrina/product.md` byte-identical, and an add/remove round trip returns the tree to its prior state — directories included, for an adapter that creates them — verified by `packages/doctrina-cli/test/integration.test.js`, `packages/doctrina-cli/test/adapter-leaves-no-trace.test.js`.
append-criterion [verified] A directory holding a kept file or a file the adapter never wrote survives the removal, and the pruning never escapes or removes the project root — verified by `packages/doctrina-cli/test/adapter-leaves-no-trace.test.js`.
bump-version minor
```
