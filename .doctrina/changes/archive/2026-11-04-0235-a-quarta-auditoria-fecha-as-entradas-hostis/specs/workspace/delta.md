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
append-requirement ubiquitous: The system shall treat as a write any MCP call whose input carries, under any key or nesting, SQL that changes state — `CALL`, `EXEC`, `COPY` and `SELECT … INTO` included — or whose `action`, `operation` or `method` argument names a write, or that sends a GraphQL `mutation`.
append-requirement event: When a tool is declared or `validate` runs at the workspace root, and an MCP configuration is readable, the system shall warn of each declared server that no configuration names, naming a key that differs only in case.
append-requirement event: When a shadowed project's folder in the workspace is gone, the system shall name `doctrina workspace attach <name>`, and `attach` shall scaffold the shadow again after warning to restore it from the workspace's git.
append-requirement event: When `doctrina doctor` or `doctrina metrics` runs at a workspace root, the system shall answer for the workspace and print the command that runs it in each project.
append-criterion [verified] the guard reads writes in every place an input carries them, and reads stay reads — verified by `packages/doctrina-cli/test/a-quarta-auditoria-fecha-as-entradas-hostis.test.js`.
append-criterion [verified] a declared server no configuration names is reported — verified by `packages/doctrina-cli/test/a-quarta-auditoria-fecha-as-entradas-hostis.test.js`.
append-criterion [verified] doctor and metrics answer at the root, and a lost shadow is scaffolded again — verified by `packages/doctrina-cli/test/a-quarta-auditoria-fecha-as-entradas-hostis.test.js`.
bump-version minor
```
