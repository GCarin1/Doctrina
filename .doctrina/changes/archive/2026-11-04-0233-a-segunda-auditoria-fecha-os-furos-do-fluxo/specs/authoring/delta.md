# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

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
append-requirement unwanted: The system shall not seed into `verify --init` a package script that keeps running — `--watchAll`, `-w`, `nodemon`, and `ng test`, `react-scripts test` or `karma start` without `--watch=false`, `--no-watch`, `--single-run` or `CI=true` — and shall seed one those flags make return.
append-requirement unwanted: The system shall not write, in a code inventory, that documentation exists beyond a root README the repository does not have.
append-requirement event: When `doctrina intake` runs with no source and the stored pending intake is a code inventory, the system shall print the absorb playbook, never the bootstrap one.
append-requirement event: When `work --delivery` ranks the capabilities a change may touch, the system shall rank them by the prompt and the delivery's `## Story` together.
append-criterion [verified] a watching script is listed as not seeded, and the flags that make a runner return are seeded — verified by `packages/doctrina-cli/test/a-segunda-auditoria-fecha-o-fluxo-multi-repo.test.js`.
append-criterion [verified] a bare `intake` reprints the absorb playbook for a stored inventory, its workspace step numbered after step 9 — verified by `packages/doctrina-cli/test/a-segunda-auditoria-fecha-o-fluxo-multi-repo.test.js`.
append-criterion [verified] a delivery's story ranks the capability its title does not name — verified by `packages/doctrina-cli/test/a-segunda-auditoria-fecha-o-fluxo-multi-repo.test.js`.
bump-version minor
```
