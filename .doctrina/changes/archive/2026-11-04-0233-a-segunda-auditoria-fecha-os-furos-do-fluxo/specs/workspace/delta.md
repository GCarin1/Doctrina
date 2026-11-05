# Spec Delta — capability: workspace

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/workspace/spec.md`

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
append-requirement event: When a registered project's intake is stored and still pending, the system shall name `doctrina intake` to resume its absorb at the workspace root, never `--from-code`, which refuses it.
append-requirement event: When `doctrina validate` runs at a workspace root and a project's `package.json` depends on the package another registered project publishes without a `dependsOn` edge to it, the system shall warn and name `doctrina workspace attach <name> --depends-on <a,b>`.
append-requirement event: When `doctrina workspace attach <name> --depends-on <a,b>` runs, the system shall replace the project's `dependsOn` with the registered names given, and refuse with exit 2 a name that is not another registered project.
append-criterion [verified] the root's `next` resumes a stored inventory with a bare `intake` — verified by `packages/doctrina-cli/test/a-segunda-auditoria-fecha-o-fluxo-multi-repo.test.js`.
append-criterion [verified] an undeclared package dependency warns at the root, and `attach --depends-on` clears it — verified by `packages/doctrina-cli/test/a-segunda-auditoria-fecha-o-fluxo-multi-repo.test.js`.
bump-version minor
```
