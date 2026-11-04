# Spec Delta — capability: delivery

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/delivery/spec.md`

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
append-requirement unwanted: The system shall not offer a task card, nor count tasks left, for a change whose `tasks.md` still holds the scaffold's placeholder boxes; it shall name `doctrina work --resume <id>` instead.
append-requirement event: When a project's only change for a delivery was abandoned, the system shall show it abandoned in the delivery's `status`, `check` and `handoff`, and name the re-route without that project as the next action.
append-requirement event: When `delivery route` would drop a project that carries an open change for the delivery, the system shall refuse with exit 3 unless `--force`, and `validate` at the root shall warn of a change naming a delivery that does not route its project.
append-requirement event: When a routed project's repository is not at its registered path, the system shall report it as moved with `doctrina workspace attach <name> --path <dir>`, and print no command that changes into the missing path.
append-requirement event: When `delivery status --json` runs, the system shall emit a payload with the delivery's rows, release boxes, other writers and blockers.
append-criterion [verified] a change of placeholder tasks is sent back to be written, never handed out — verified by `packages/doctrina-cli/test/a-terceira-auditoria-fecha-os-caminhos-de-falha.test.js`.
append-criterion [verified] an abandoned change stays on the delivery's record and blocks its close — verified by `packages/doctrina-cli/test/a-terceira-auditoria-fecha-os-caminhos-de-falha.test.js`.
append-criterion [verified] routing out a project with an open change is refused, and an orphan warns — verified by `packages/doctrina-cli/test/a-terceira-auditoria-fecha-os-caminhos-de-falha.test.js`.
append-criterion [verified] a moved repository is reported as moved — verified by `packages/doctrina-cli/test/a-terceira-auditoria-fecha-os-caminhos-de-falha.test.js`.
bump-version minor
```
