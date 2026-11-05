# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

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
To take one out: `remove-requirement <section> <n>` / `remove-criterion <n>`
(the criteria after it renumber; write removals highest number first).
append-* ops resolve numbering/position at APPLY time, so several open
changes appending to the same spec never collide on numbers — order of
application decides.

For REMOVED: the body may be empty; on apply, the target spec file is
deleted and the capability is recorded in the change archive only.
-->

---

<!-- delta body below -->

```ops
append-requirement event: When `doctrina review --change <id>` decides which capability owns a changed file, the system shall read each spec the change targets as the change will leave it — its ops applied in memory, as `change check` dry-runs them — so a file cited by a criterion the change appends, or claimed by a `Source:` it sets, is not reported as belonging to no capability before `apply` merges the delta.
append-criterion [verified] A test cited only by the change's delta, and a path claimed only by a `Source:` the delta sets, are owned under `review --change`, and a plain `review` reports the test as owner-less — verified by `packages/doctrina-cli/test/o-review-do-close-olha-a-change.test.js`.
append-requirement event: When `doctrina verify --init` runs in a project whose manifests declare build or test commands the code inventory recognises, the system shall write those commands as the starter checks, each named as the inventory names it, and print them for the human to confirm; with none it shall write the fail-closed example.
append-criterion [verified] `verify --init` in a project with `test`, `build` and `start` scripts writes `npm run test` and `npm run build` and never `start`, and with no candidate keeps the fail-closed example — verified by `packages/doctrina-cli/test/o-verify-init-parte-do-inventario.test.js`.
bump-version minor
```
