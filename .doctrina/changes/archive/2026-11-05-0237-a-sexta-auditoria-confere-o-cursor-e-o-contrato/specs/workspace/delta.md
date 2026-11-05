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
append-requirement event: When the Claude-format `workspace guard` runs under Cursor with no opinion on the call, the system shall answer the Claude-format allow instead of nothing, and read the server from Cursor's own payload.
append-criterion [verified] under Cursor the Claude-format guard never answers a permission hook with nothing — verified by `packages/doctrina-cli/test/a-sexta-auditoria-confere-o-cursor.test.js`.
append-criterion [verified] the Cursor files the CLI writes use only the hook events and rule fields Cursor documents — verified by `packages/doctrina-cli/test/a-sexta-auditoria-confere-o-cursor.test.js`.
bump-version minor
```
