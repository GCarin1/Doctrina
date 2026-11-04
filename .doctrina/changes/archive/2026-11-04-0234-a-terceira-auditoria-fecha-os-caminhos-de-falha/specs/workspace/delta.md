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
append-requirement ubiquitous: The system shall write the `doctrina workspace guard` hook into the Cursor and Claude Code hook files of every shadowed project, beside the workspace root's.
append-requirement event: When `doctrina validate` runs at a workspace root that declares tools, the system shall warn of each in-repo project whose `.cursor/hooks.json` or `.claude/settings.json` runs no `doctrina workspace guard`.
append-requirement event: When a command finds no `.doctrina/` in a clone of a repository the workspace shadows elsewhere, the system shall name `doctrina workspace attach <name> --path <clone>` from the workspace, and `doctrina init` shall refuse with exit 3 unless `--force`.
append-criterion [verified] a shadow's hooks run the guard, and an unguarded in-repo project is named — verified by `packages/doctrina-cli/test/a-terceira-auditoria-fecha-os-caminhos-de-falha.test.js`.
append-criterion [verified] a second clone of a shadowed repository is pointed at attach, and init plants nothing there — verified by `packages/doctrina-cli/test/a-terceira-auditoria-fecha-os-caminhos-de-falha.test.js`.
bump-version minor
```
