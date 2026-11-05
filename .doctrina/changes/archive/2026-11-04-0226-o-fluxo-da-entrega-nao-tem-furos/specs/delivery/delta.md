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
append-requirement event: When `doctrina delivery tick <id>` runs, the system shall list the `## Release` boxes with their numbers, and with numbers or `--all` tick them, refusing a number that names no box with the usage class.
append-requirement unwanted: If `doctrina delivery new --projects` or `doctrina delivery route` names a project that is still pending or whose repository is missing, then the system shall not route it: it exits with the precondition class, naming `doctrina intake --from-code` or `doctrina workspace attach`, unless `--force` is given.
append-requirement event: When `doctrina delivery status <id>` runs, the system shall print, for every open change with unticked tasks, the command that reads its next task card from inside its repository, and shall name every other open change in a routed repository as a second writer to sequence.
append-requirement event: When `doctrina work --resume <change> --delivery <id>` runs on a change that carries no delivery, the system shall write `- **Delivery:** <id>` into its proposal; on a change that already belongs to another delivery it shall refuse with the precondition class.
append-requirement event: When `doctrina prime` or `doctrina prime --pulse` lists an open change that carries a delivery, the system shall name that delivery beside it.
append-criterion [verified] A pending project is refused by `delivery new --projects` and `delivery route` with exit 3 naming `intake --from-code` and routed with `--force`; `delivery tick` lists, ticks and refuses a bad number; `delivery status` prints the card command and the second writer; `prime` and the pulse name the delivery; `work --resume --delivery` joins a change and refuses one already in another delivery — verified by `packages/doctrina-cli/test/o-fluxo-da-entrega-nao-tem-furos.test.js`.
bump-version minor
```
